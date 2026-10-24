'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const express=require('express'),request=require('supertest'),{newDb}=require('pg-mem');
const {makePushRouter,validSubscription,deliver}=require('./push-notifications');
const announcements=require('./announcements-router'),invites=require('./invites_pg');
const config={FW_PUSH_PUBLIC_KEY:'public-key',FW_PUSH_PRIVATE_KEY:'private-key'};
const subscription=(suffix='one')=>({endpoint:`https://fcm.googleapis.com/fcm/send/${suffix}`,keys:{p256dh:'A'.repeat(87),auth:'B'.repeat(22)}});
function setup(){
 const db=newDb();db.public.none(fs.readFileSync(__dirname+'/announcements.sql','utf8'));db.public.none(fs.readFileSync(__dirname+'/push-notifications.sql','utf8'));
 db.public.none(`CREATE TABLE events(id text PRIMARY KEY,owner_uid text);CREATE TABLE invites(token text PRIMARY KEY,event_id text,expires_at timestamptz,responded_at timestamptz,response text,invited_email text,responder_name text,guests_count integer,message text);
 CREATE TABLE event_entitlements(event_id text,status text,product_code text,share_invite_token text);
 CREATE TABLE share_link_rsvps(id serial PRIMARY KEY,event_id text,invite_token text,response_key text,responder_email text,responder_name text,response text,guests_count integer,message text,responded_at timestamptz);
 CREATE TABLE commerce_events(event_id text,event_name text,detail jsonb);`);
 const {Pool}=db.adapters.createPg(),pool=new Pool();const app=express();app.use(express.json());
 const auth=(req,res,next)=>{req.uid=req.headers.authorization;if(!req.uid)return res.status(401).json({ok:false});next();};
 app.use(makePushRouter(pool,auth,config));app.use(announcements(pool,auth));app.use('/invites',invites(pool));return{app,pool};
}
test('subscription endpoints reject arbitrary network destinations and malformed keys',()=>{
 assert.ok(validSubscription(subscription()));
 for(const endpoint of ['http://fcm.googleapis.com/x','https://localhost/x','https://127.0.0.1/x','https://fcm.googleapis.com.evil.test/x','https://user:pass@fcm.googleapis.com/x'])assert.ok(!validSubscription({...subscription(),endpoint}));
 assert.ok(!validSubscription({...subscription(),keys:{p256dh:'bad',auth:'bad'}}));
});
test('subscriptions require auth, remain owner-scoped and never disclose private VAPID key',async()=>{
 const {app,pool}=setup();try{
 assert.equal((await request(app).post('/notifications/subscribe').send(subscription())).status,401);
 const c=await request(app).get('/notifications/config').set('Authorization','owner');assert.equal(c.body.publicKey,'public-key');assert.ok(!JSON.stringify(c.body).includes('private-key'));
 assert.equal((await request(app).post('/notifications/subscribe').set('Authorization','owner').send(subscription())).status,200);
 assert.equal((await request(app).post('/notifications/subscribe').set('Authorization','stranger').send(subscription())).status,409);
 assert.equal((await request(app).post('/notifications/status').set('Authorization','stranger').send(subscription())).body.subscribed,false);
 await request(app).post('/notifications/unsubscribe').set('Authorization','stranger').send(subscription());assert.equal((await pool.query('SELECT * FROM fw_push_subscriptions')).rowCount,1);
 await request(app).post('/notifications/unsubscribe').set('Authorization','owner').send(subscription());assert.equal((await pool.query('SELECT * FROM fw_push_subscriptions')).rowCount,0);
 }finally{await pool.end();}
});
test('announcement reply queues only its owner devices, with no private message on lock screen',async()=>{
 const {app,pool}=setup();try{
 for(const [owner,endpoint] of [['owner','one'],['other','two']])await request(app).post('/notifications/subscribe').set('Authorization',owner).send(subscription(endpoint));
 const created=await request(app).post('/announcements').set('Authorization','owner').send({title:'Hospital',message:'Sensitive update',theme:'forest'});const id=created.body.id;
 assert.equal((await request(app).post(`/announcements/${id}/replies`).send({name:'Sister',message:'A private response'})).status,200);
 const rows=await pool.query('SELECT * FROM fw_push_deliveries');assert.equal(rows.rowCount,1);assert.equal(rows.rows[0].payload.url,`/announcements?announcement=${id}`);assert.ok(!JSON.stringify(rows.rows).includes('private response'));
 assert.equal((await request(app).post(`/announcements/${id}/replies`).send({name:'',message:'Bad'})).status,400);assert.equal((await pool.query('SELECT * FROM fw_push_deliveries')).rowCount,1);
 await request(app).post('/notifications/unsubscribe').set('Authorization','owner').send(subscription());assert.equal((await pool.query('SELECT * FROM fw_push_deliveries')).rowCount,0);
 }finally{await pool.end();}
});
test('email RSVP and shared-link RSVP create owner notifications after saving responses',async()=>{
 const {app,pool}=setup();try{
 await request(app).post('/notifications/subscribe').set('Authorization','owner').send(subscription());
 await pool.query("INSERT INTO events VALUES('12','owner')");
 await pool.query("INSERT INTO invites(token,event_id,expires_at) VALUES('email','12',$1),('shared','12',$1)",[new Date(Date.now()+3600000)]);
 await pool.query("INSERT INTO event_entitlements VALUES('12','free','free_event','shared')");
 let result=await request(app).post('/invites/respond').send({token:'email',response:'yes',responderName:'Brother'});assert.equal(result.status,200);
 result=await request(app).post('/invites/respond').send({token:'shared',response:'maybe',responderName:'Sister'});assert.equal(result.status,200);const key=result.body.responseKey;
 result=await request(app).post('/invites/respond').send({token:'shared',response:'yes',responderName:'Sister',responseKey:key});assert.equal(result.status,200);
 const rows=await pool.query('SELECT * FROM fw_push_deliveries');assert.equal(rows.rowCount,3);assert.ok(rows.rows.every(r=>r.payload.url==='/events/12'));
 assert.equal((await pool.query('SELECT response FROM share_link_rsvps')).rows[0].response,'yes');
 }finally{await pool.end();}
});
test('worker sends, retries temporary failures, removes expired devices and bounds retries',async()=>{
 for(const status of [200,503,410,404]){
  const queries=[];const pool={query:async(sql,args)=>{queries.push({sql,args});return {rowCount:1,rows:[{...subscription(),...subscription().keys}]};}};
  let sent=false;const provider={sendNotification:async(sub,payload,options)=>{sent=true;assert.equal(JSON.parse(payload).tag,'reply-9');assert.equal(options.timeout,10000);if(status!==200)throw {statusCode:status};}};
  await deliver(pool,provider,{id:9,subscription_id:'device',attempts:1,payload:{body:'New reply'}},config);assert.ok(sent);
  assert.match(queries.at(-1).sql,status===200?/DELETE FROM fw_push_deliveries/:status===503?/UPDATE fw_push_deliveries/:/DELETE FROM fw_push_subscriptions/);
 }
});
