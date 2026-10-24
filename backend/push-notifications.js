'use strict';
const crypto = require('crypto');
const express = require('express');

function validSubscription(s) {
 try {
  const u = new URL(s.endpoint);
  const allowed = u.hostname === 'fcm.googleapis.com' || u.hostname === 'updates.push.services.mozilla.com' || u.hostname === 'web.push.apple.com' || u.hostname.endsWith('.push.apple.com') || u.hostname.endsWith('.notify.windows.com');
  return allowed && u.protocol === 'https:' && !u.username && !u.password && !u.port && !u.hash && s.endpoint.length < 2048 &&
   /^[A-Za-z0-9_-]{87}$/.test(s.keys?.p256dh || '') && /^[A-Za-z0-9_-]{22}$/.test(s.keys?.auth || '');
 } catch { return false; }
}

function makePushRouter(pool, auth, config = process.env) {
 const r = express.Router();
 r.use('/notifications', auth);
 const ready = () => Boolean(config.FW_PUSH_PUBLIC_KEY && config.FW_PUSH_PRIVATE_KEY);
 const wrap = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(() => res.status(503).json({ok:false,error:'Notifications are temporarily unavailable.'}));
 r.get('/notifications/config', wrap(async(req,res) => res.json({ok:true,enabled:ready(),publicKey:ready()?config.FW_PUSH_PUBLIC_KEY:null})));
 r.post('/notifications/status', wrap(async(req,res) => {
  const q=await pool.query('SELECT id FROM fw_push_subscriptions WHERE owner_uid=$1 AND endpoint=$2',[req.uid,String(req.body?.endpoint||'')]);
  res.json({ok:true,subscribed:q.rowCount>0});
 }));
 r.post('/notifications/subscribe', wrap(async(req,res) => {
  if(!ready())return res.status(503).json({ok:false,error:'Notifications have not been enabled on the server yet.'});
  const s=req.body;
  if(!validSubscription(s))return res.status(400).json({ok:false,error:'This browser could not create a supported notification subscription.'});
  const existing=await pool.query('SELECT id,owner_uid FROM fw_push_subscriptions WHERE endpoint=$1',[s.endpoint]);
  if(existing.rowCount && existing.rows[0].owner_uid!==req.uid)return res.status(409).json({ok:false,error:'This browser is registered to another account. Turn notifications off in that account first.'});
  const count=await pool.query('SELECT id FROM fw_push_subscriptions WHERE owner_uid=$1',[req.uid]);
  if(!existing.rowCount&&count.rowCount>=10)return res.status(409).json({ok:false,error:'Notifications are already enabled on ten devices.'});
  const saved=await pool.query(`INSERT INTO fw_push_subscriptions(id,owner_uid,endpoint,p256dh,auth) VALUES($1,$2,$3,$4,$5)
   ON CONFLICT(endpoint) DO UPDATE SET p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth WHERE fw_push_subscriptions.owner_uid=EXCLUDED.owner_uid RETURNING id`,[crypto.randomUUID(),req.uid,s.endpoint,s.keys.p256dh,s.keys.auth]);
  if(!saved.rowCount)return res.status(409).json({ok:false,error:'This browser is registered to another account.'});
  res.json({ok:true});
 }));
 r.post('/notifications/unsubscribe',wrap(async(req,res)=>{
  await pool.query('DELETE FROM fw_push_subscriptions WHERE owner_uid=$1 AND endpoint=$2',[req.uid,String(req.body?.endpoint||'')]);
  res.json({ok:true});
 }));
 return r;
}

// Called inside the response transaction. Network delivery happens separately;
// a phone being offline or a push provider failing never loses the RSVP/reply.
async function queueReply(client, kind, id) {
 const owner = kind==='announcement'
  ? await client.query('SELECT owner_uid FROM fw_announcements WHERE id=$1',[id])
  : await client.query('SELECT owner_uid FROM events WHERE id=$1',[id]);
 if(!owner.rowCount)return;
 const payload={title:'Family Weather',body:kind==='announcement'?'Someone replied to your announcement.':'Someone responded to your invitation.',url:kind==='announcement'?`/announcements?announcement=${encodeURIComponent(id)}`:`/events/${encodeURIComponent(id)}`};
 const key=crypto.randomUUID();
 await client.query(`INSERT INTO fw_push_deliveries(subscription_id,event_key,payload)
  SELECT id,$2,$3::jsonb FROM fw_push_subscriptions WHERE owner_uid=$1 ON CONFLICT DO NOTHING`,[owner.rows[0].owner_uid,key,JSON.stringify(payload)]);
}

async function deliver(pool, webpush, item, config=process.env) {
 const sub=await pool.query('SELECT endpoint,p256dh,auth FROM fw_push_subscriptions WHERE id=$1',[item.subscription_id]);
 if(!sub.rowCount) return;
 try {
  await webpush.sendNotification({endpoint:sub.rows[0].endpoint,keys:{p256dh:sub.rows[0].p256dh,auth:sub.rows[0].auth}},JSON.stringify({...item.payload,tag:`reply-${item.id}`}),{
   TTL:86400,timeout:10000,vapidDetails:{subject:'mailto:contact@thefamilyweather.com',publicKey:config.FW_PUSH_PUBLIC_KEY,privateKey:config.FW_PUSH_PRIVATE_KEY}
  });
  await pool.query('DELETE FROM fw_push_deliveries WHERE id=$1',[item.id]);
 } catch(e) {
  if(e.statusCode===404||e.statusCode===410)await pool.query('DELETE FROM fw_push_subscriptions WHERE id=$1',[item.subscription_id]);
  else if(item.attempts>=10)await pool.query('DELETE FROM fw_push_deliveries WHERE id=$1',[item.id]);
  else await pool.query("UPDATE fw_push_deliveries SET claimed_until=NULL,available_at=$2 WHERE id=$1",[item.id,new Date(Date.now()+Math.min(3600000,30000*2**item.attempts))]);
 }
}
function startPushWorker(pool, webpush, config=process.env) {
 if(!config.FW_PUSH_PUBLIC_KEY||!config.FW_PUSH_PRIVATE_KEY)return;
 let running=false;
 async function tick(){
  if(running)return;running=true;
  try{
   await pool.query("DELETE FROM fw_push_deliveries WHERE created_at < now() - interval '1 day'");
   const items=await pool.query(`UPDATE fw_push_deliveries SET claimed_until=now()+interval '2 minutes',attempts=attempts+1
    WHERE id IN (SELECT id FROM fw_push_deliveries WHERE available_at<=now() AND (claimed_until IS NULL OR claimed_until<now()) ORDER BY id LIMIT 10 FOR UPDATE SKIP LOCKED) RETURNING *`);
   for(const item of items.rows)await deliver(pool,webpush,item,config);
  }catch{console.error('Push delivery queue temporarily unavailable');}finally{running=false;}
 }
 const timer=setInterval(tick,5000);timer.unref();void tick();return ()=>clearInterval(timer);
}
module.exports={makePushRouter,queueReply,startPushWorker,validSubscription,deliver};
