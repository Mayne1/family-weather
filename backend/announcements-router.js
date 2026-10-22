"use strict";
const express=require('express');
const crypto=require('crypto');
const {phone,smsContent,validSignature,paidOrder,disclosure,CONSENT_VERSION,secretMatches}=require('./announcement-rules');
const uid=()=>crypto.randomBytes(16).toString('hex');
const error=(res,status,message)=>res.status(status).json({ok:false,error:message});
const ready=()=>process.env.FW_SMS_ENABLED==='true'&&process.env.FW_SMS_PROVIDER_VERIFIED==='true'&&Boolean(process.env.BREVO_SMS_WEBHOOK_SECRET?.length>=32)&&Boolean(process.env.BREVO_API_KEY&&process.env.BREVO_SMS_SENDER&&process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_WEBHOOK_SECRET);
module.exports=function makeAnnouncementsRouter(pool,auth){
 const r=express.Router();
 const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(e=>{console.error('announcements:',e.message);error(res,503,'The announcement service is temporarily unavailable. Please try again.');});
 const owned=async(req)=> (await pool.query('SELECT * FROM fw_announcements WHERE id=$1 AND owner_uid=$2',[req.params.id,req.uid])).rows[0];
 const limits=new Map();
 function limit(req,res,next){const key=req.uid||req.ip;const now=Date.now();if(limits.size>10000)for(const[k,v]of limits)if(v.until<now)limits.delete(k);let v=limits.get(key);if(!v||v.until<now)v={count:0,until:now+60000};v.count++;limits.set(key,v);if(v.count>20)return error(res,429,'Please wait a minute before trying again.');next();}

 // These public routes never expose subscriber lists or account IDs.
 r.get('/announcements/sms-channel',auth,wrap(async(req,res)=>{
  const channel=(await pool.query('SELECT token,name FROM fw_sms_channels WHERE owner_uid=$1',[req.uid])).rows[0];
  const contacts=await pool.query('SELECT c.recipient, MAX(c.created_at) AS consent_at FROM fw_sms_consents c LEFT JOIN fw_sms_suppressions s ON s.recipient=c.recipient WHERE c.owner_uid=$1 AND s.recipient IS NULL GROUP BY c.recipient',[req.uid]);
  res.json({ok:true,channel:channel||null,contacts:contacts.rows});
 }));
 r.post('/announcements/sms-channel',auth,limit,wrap(async(req,res)=>{
  const name=String(req.body?.name||'').trim();if(!name||name.length>80)return error(res,400,'Enter your name so recipients know whose announcements they are signing up for.');
  // Keep the name stable: existing consent must not silently change scope.
  await pool.query('INSERT INTO fw_sms_channels(token,owner_uid,name) VALUES($1,$2,$3) ON CONFLICT(owner_uid) DO NOTHING',[uid(),req.uid,name]);
  res.json({ok:true,channel:(await pool.query('SELECT token,name FROM fw_sms_channels WHERE owner_uid=$1',[req.uid])).rows[0]});
 }));
 r.get('/announcements/sms-signup/:token',wrap(async(req,res)=>{
  const channel=(await pool.query('SELECT name FROM fw_sms_channels WHERE token=$1',[req.params.token])).rows[0];
  if(!channel)return error(res,404,'This signup link is unavailable.');
  res.json({ok:true,name:channel.name,disclosure:disclosure(channel.name),version:CONSENT_VERSION});
 }));
 r.post('/announcements/sms-signup/:token',limit,wrap(async(req,res)=>{
  const channel=(await pool.query('SELECT owner_uid,name FROM fw_sms_channels WHERE token=$1',[req.params.token])).rows[0];
  if(!channel)return error(res,404,'This signup link is unavailable.');
  if(req.body?.website||req.body?.consent!==true||req.body?.version!==CONSENT_VERSION)return error(res,400,'Please read and accept the SMS consent checkbox. Reload if the terms have changed.');
  const name=String(req.body?.name||'').trim();if(!name||name.length>80)return error(res,400,'Enter your name.');
  let recipient;try{recipient=phone(req.body?.phone);}catch(e){return error(res,400,e.message);}
  if((await pool.query('SELECT recipient FROM fw_sms_suppressions WHERE recipient=$1',[recipient])).rowCount)return error(res,409,'This number has opted out. Contact contact@thefamilyweather.com if you want to rejoin.');
  const token=crypto.randomBytes(32).toString('hex');
  await pool.query('INSERT INTO fw_sms_consents(id,owner_uid,recipient,name,disclosure,version,source_url,user_agent,revoke_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[uid(),channel.owner_uid,recipient,name,disclosure(channel.name),CONSENT_VERSION,`https://thefamilyweather.com/sms-signup/${req.params.token}`,String(req.headers['user-agent']||'').slice(0,500),crypto.createHash('sha256').update(token).digest('hex')]);
  res.json({ok:true,revoke_token:token});
 }));
 r.post('/announcements/sms-preferences/:token',limit,wrap(async(req,res)=>{
  if(!/^[a-f0-9]{64}$/.test(req.params.token))return error(res,404,'Preference link unavailable.');
  const record=(await pool.query('SELECT recipient FROM fw_sms_consents WHERE revoke_hash=$1',[crypto.createHash('sha256').update(req.params.token).digest('hex')])).rows[0];
  if(!record)return error(res,404,'Preference link unavailable.');
  await pool.query("INSERT INTO fw_sms_suppressions(recipient,reason) VALUES($1,'website opt-out') ON CONFLICT DO NOTHING",[record.recipient]);
  res.json({ok:true});
 }));
 // Configure a Brevo SMS webhook with this custom header. Never use a URL secret.
 r.post('/announcements/sms-webhook',wrap(async(req,res)=>{
  if(!secretMatches(req.headers['x-fw-sms-secret'],process.env.BREVO_SMS_WEBHOOK_SECRET))return error(res,401,'Unauthorized');
  const events=Array.isArray(req.body)?req.body:[req.body];if(events.length>100)return error(res,400,'Too many events.');
  for(const event of events){
   const status=String(event?.msg_status||event?.event||event?.description||'').toLowerCase();
   if(!['unsubscribed','unsubscribe','blacklisted','blocked'].includes(status))continue;
   let recipient;try{recipient=phone(event.to);}catch{continue;}
   await pool.query('INSERT INTO fw_sms_suppressions(recipient,reason) VALUES($1,$2) ON CONFLICT DO NOTHING',[recipient,`brevo ${status}`]);
  }
  // START does not silently restore permissions to every organizer.
  res.json({ok:true});
 }));
 r.get('/announcements',auth,wrap(async(req,res)=>{
  const items=await pool.query('SELECT id,title,theme,closed,created_at FROM fw_announcements WHERE owner_uid=$1 ORDER BY created_at DESC LIMIT 100',[req.uid]);
  const wallet=await pool.query('SELECT balance FROM fw_sms_wallets WHERE owner_uid=$1',[req.uid]);
  res.json({ok:true,announcements:items.rows,balance:wallet.rows[0]?.balance||0,sms_ready:ready()});
 }));
 r.post('/announcements',auth,limit,wrap(async(req,res)=>{
  const {title,message,theme}=req.body||{};
  if(typeof title!=='string'||!title.trim()||title.length>120||typeof message!=='string'||!message.trim()||message.length>4000||!['forest','sunrise','evening'].includes(theme))return error(res,400,'Add a title and message, and choose a design.');
  const id=uid();await pool.query('INSERT INTO fw_announcements(id,owner_uid,title,message,theme) VALUES($1,$2,$3,$4,$5)',[id,req.uid,title.trim(),message.trim(),theme]);res.json({ok:true,id});
 }));
 r.get('/announcements/:id',wrap(async(req,res)=>{
  const q=await pool.query('SELECT id,title,message,theme,closed,created_at FROM fw_announcements WHERE id=$1',[req.params.id]);if(!q.rowCount||q.rows[0].closed)return error(res,404,'This announcement is unavailable.');res.json({ok:true,announcement:q.rows[0]});
 }));
 r.post('/announcements/:id/replies',limit,wrap(async(req,res)=>{
  const {name,message,website}=req.body||{};if(website)return error(res,400,'Reply could not be saved.');
  if(typeof name!=='string'||!name.trim()||name.length>80||typeof message!=='string'||!message.trim()||message.length>2000)return error(res,400,'Enter your name and a message (up to 2,000 characters).');
  const q=await pool.query('INSERT INTO fw_announcement_replies(announcement_id,name,message) SELECT id,$2,$3 FROM fw_announcements WHERE id=$1 AND closed=false RETURNING id',[req.params.id,name.trim(),message.trim()]);
  if(!q.rowCount)return error(res,404,'This announcement is unavailable.');res.json({ok:true});
 }));
 r.get('/announcements/:id/manage',auth,wrap(async(req,res)=>{
  const a=await owned(req);if(!a)return error(res,404,'Announcement not found.');
  const replies=await pool.query('SELECT id,name,message,created_at FROM fw_announcement_replies WHERE announcement_id=$1 ORDER BY created_at DESC LIMIT 500',[a.id]);
  const sends=await pool.query('SELECT id,recipient,status,created_at FROM fw_sms_sends WHERE announcement_id=$1 ORDER BY created_at DESC LIMIT 100',[a.id]);
  res.json({ok:true,announcement:a,replies:replies.rows,sends:sends.rows});
 }));
 r.post('/announcements/:id/close',auth,wrap(async(req,res)=>{const a=await owned(req);if(!a)return error(res,404,'Announcement not found.');await pool.query('UPDATE fw_announcements SET closed=true WHERE id=$1',[a.id]);res.json({ok:true});}));
 r.post('/announcements/:id/checkout',auth,limit,wrap(async(req,res)=>{
  if(!ready())return error(res,503,'SMS purchasing is not available yet. Sharing your link is free.');
  const a=await owned(req);if(!a||a.closed)return error(res,404,'Announcement not found.');
  const id=String(req.body?.request_id||'');if(!/^[a-f0-9-]{36}$/.test(id))return error(res,400,'Invalid checkout request.');
  await pool.query('INSERT INTO fw_sms_orders(id,owner_uid,announcement_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[id,req.uid,a.id]);
  const order=(await pool.query('SELECT * FROM fw_sms_orders WHERE id=$1 AND owner_uid=$2 AND announcement_id=$3',[id,req.uid,a.id])).rows[0];if(!order)return error(res,409,'Start a new checkout.');if(order.paid)return error(res,409,'This pack is already paid. Refresh your balance.');if(order.checkout_url)return res.json({ok:true,checkout_url:order.checkout_url});
  const form=new URLSearchParams({mode:'payment','payment_method_types[0]':'card','line_items[0][price_data][currency]':'usd','line_items[0][price_data][unit_amount]':'99','line_items[0][price_data][product_data][name]':'Family Weather - 10 U.S. announcement texts','line_items[0][quantity]':'1','metadata[fw_sms_order]':id,success_url:'https://thefamilyweather.com/announcements?payment=processing',cancel_url:'https://thefamilyweather.com/announcements?payment=cancelled'});
  const response=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':`fw-sms-${id}`},body:form,signal:AbortSignal.timeout(15000)});const s=await response.json();
  if(!response.ok||!String(s.id).startsWith('cs_')||!String(s.url).startsWith('https://checkout.stripe.com/'))return error(res,502,'Checkout could not be opened. You have not received credits.');
  await pool.query('UPDATE fw_sms_orders SET session_id=$2,checkout_url=$3 WHERE id=$1',[id,s.id,s.url]);res.json({ok:true,checkout_url:s.url});
 }));
 async function confirm(session){
  const c=await pool.connect();try{await c.query('BEGIN');const order=(await c.query('SELECT * FROM fw_sms_orders WHERE id=$1 FOR UPDATE',[String(session.metadata?.fw_sms_order||'')])).rows[0];
   if(!paidOrder(session,order))throw new Error('Invalid SMS payment confirmation');
   if(!order.paid){await c.query('UPDATE fw_sms_orders SET paid=true WHERE id=$1',[order.id]);await c.query('INSERT INTO fw_sms_wallets(owner_uid,balance) VALUES($1,10) ON CONFLICT(owner_uid) DO UPDATE SET balance=fw_sms_wallets.balance+10',[order.owner_uid]);}
   await c.query('COMMIT');
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 // This router is mounted before the existing event webhook. Unrelated purchases pass through.
 r.post('/billing/stripe-webhook',wrap(async(req,res,next)=>{
  let event;try{event=JSON.parse(req.body?.payload||'');}catch{return next();}
  if(!event?.data?.object?.metadata?.fw_sms_order)return next();
  if(!validSignature(req.body.payload,req.body.signature,process.env.STRIPE_WEBHOOK_SECRET))return error(res,400,'Invalid payment signature.');
  if(event.type!=='checkout.session.completed')return res.json({ok:true,ignored:true});
  await confirm(event.data.object);res.json({ok:true});
 }));
 r.post('/announcements/payments/refresh',auth,limit,wrap(async(req,res)=>{
  if(!process.env.STRIPE_SECRET_KEY)return error(res,503,'Payments unavailable.');
  const orders=await pool.query('SELECT session_id FROM fw_sms_orders WHERE owner_uid=$1 AND paid=false AND session_id IS NOT NULL ORDER BY created_at DESC LIMIT 5',[req.uid]);
  for(const order of orders.rows){const response=await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(order.session_id)}`,{headers:{Authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`},signal:AbortSignal.timeout(10000)});if(response.ok){const session=await response.json();if(session.payment_status==='paid')await confirm(session);}}
  res.json({ok:true});
 }));
 r.post('/announcements/:id/sms',auth,limit,wrap(async(req,res)=>{
  if(!ready())return error(res,503,'SMS is not available yet.');const a=await owned(req);if(!a||a.closed)return error(res,404,'Announcement unavailable.');
  let recipient;try{recipient=phone(req.body?.recipient);}catch(e){return error(res,400,e.message);}
  const id=String(req.body?.request_id||'');if(!/^[a-f0-9-]{36}$/.test(id))return error(res,400,'Invalid send request.');
  const c=await pool.connect();let send;
  try{await c.query('BEGIN');await c.query('INSERT INTO fw_sms_wallets(owner_uid,balance) VALUES($1,0) ON CONFLICT DO NOTHING',[req.uid]);await c.query('SELECT balance FROM fw_sms_wallets WHERE owner_uid=$1 FOR UPDATE',[req.uid]);
   const consent=(await c.query('SELECT id FROM fw_sms_consents WHERE owner_uid=$1 AND recipient=$2 ORDER BY created_at DESC LIMIT 1',[req.uid,recipient])).rows[0];
   const blocked=(await c.query('SELECT recipient FROM fw_sms_suppressions WHERE recipient=$1',[recipient])).rowCount;
   if(!consent||blocked){await c.query('ROLLBACK');return error(res,403,'This recipient must sign up through your SMS signup link and must not have opted out. No text credit was used.');}
   const previous=(await c.query('SELECT id,status FROM fw_sms_sends WHERE announcement_id=$1 AND recipient=$2',[a.id,recipient])).rows[0];
   if(previous){await c.query('ROLLBACK');return res.json({ok:true,status:previous.status,repeated:true});}
   const debit=await c.query('UPDATE fw_sms_wallets SET balance = balance - 1 WHERE owner_uid=$1 AND balance>0 RETURNING balance',[req.uid]);if(!debit.rowCount){await c.query('ROLLBACK');return error(res,402,'Buy a text pack first, or share your link for free.');}
   await c.query('INSERT INTO fw_sms_sends(id,owner_uid,announcement_id,recipient,consent_id) VALUES($1,$2,$3,$4,$5)',[id,req.uid,a.id,recipient,consent.id]);await c.query('COMMIT');send=true;
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  if(!send)return;
  let response;
  try{response=await fetch('https://api.brevo.com/v3/transactionalSMS/send',{method:'POST',headers:{'api-key':process.env.BREVO_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({sender:process.env.BREVO_SMS_SENDER,recipient,content:smsContent(a.id),type:'transactional',unicodeEnabled:false,tag:`fw-${id}`}),signal:AbortSignal.timeout(15000)});}catch{
   await pool.query("UPDATE fw_sms_sends SET status='unknown' WHERE id=$1",[id]);return res.json({ok:true,status:'unknown'});
  }
  if(!response.ok&&response.status<500){const c=await pool.connect();try{await c.query('BEGIN');await c.query("UPDATE fw_sms_sends SET status='rejected' WHERE id=$1",[id]);await c.query('UPDATE fw_sms_wallets SET balance = balance + 1 WHERE owner_uid=$1',[req.uid]);await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}return res.json({ok:true,status:'rejected'});}
  const data=await response.json().catch(()=>null);const status=response.ok&&data?.messageId?'accepted':'unknown';await pool.query('UPDATE fw_sms_sends SET status=$2,provider_id=$3 WHERE id=$1',[id,status,data?.messageId?String(data.messageId):null]);res.json({ok:true,status});
 }));
 return r;
};
