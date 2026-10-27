'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');
const express=require('express'),request=require('supertest'),{newDb}=require('pg-mem');
const makeRouter=require('./event-entitlements-router');
const {hash}=require('./family-access');const {planFor,paidPlan}=require('./commerce-plans');
function setup(){
 const db=newDb();
 db.public.none('CREATE TABLE events(id BIGINT PRIMARY KEY,owner_uid TEXT); CREATE TABLE invites(token TEXT PRIMARY KEY,event_id TEXT,inviter_email TEXT,invited_email TEXT,expires_at TIMESTAMPTZ);');
 const sql=fs.readFileSync(__dirname+'/event-entitlements.sql','utf8').split('CREATE TABLE IF NOT EXISTS family_weather_migrations')[0];
 db.public.none(sql);db.public.none(fs.readFileSync(__dirname+'/family-access.sql','utf8'));
 const {Pool}=db.adapters.createPg();const pool=new Pool();
 // pg-mem does not implement PostgreSQL table locks; production uses the real lock.
 const originalConnect=pool.connect.bind(pool);pool.connect=async()=>{const c=await originalConnect();const q=c.query.bind(c);c.query=(sql,args)=>sql.startsWith('LOCK TABLE')?Promise.resolve({rows:[],rowCount:0}):q(sql,args);return c;};
 const app=express();app.use(express.json());app.use(makeRouter(pool,(req,res,next)=>{req.uid=req.headers.authorization;if(!req.uid)return res.status(401).json({ok:false});next();}));
 app.use('/invites',require('./invites_pg')(pool));
 return {pool,app};
}
test('family membership, repeat redemption, new events, isolation, limits, and code closing',async()=>{
 process.env.FAMILY_WEATHER_PROMO_ADMIN_UIDS='admin';const {pool,app}=setup();
 try {
  const post=(uid,body)=>request(app).post('/billing/promo-codes').set('Authorization',uid).send(body);
  assert.equal((await request(app).get('/billing/promo-codes?family=1')).status,401);
  assert.equal((await post('outsider',{action:'family_create'})).status,403);
  const made=await post('admin',{action:'family_create'});assert.equal(made.status,200);const code=made.body.code;assert.match(code,/^FW-FAMILY-[A-F0-9]{24}$/);
  assert.equal((await pool.query('SELECT code_hash FROM family_access_codes')).rows[0].code_hash,hash(code));
  assert.equal((await post('aunt',{action:'family_redeem',code:'wrong'})).status,400);
  await pool.query("INSERT INTO events VALUES(1,'aunt'),(2,'outsider'),(3,'uncle')");
  assert.equal((await post('aunt',{action:'family_redeem',code})).status,200);
  assert.equal((await post('aunt',{action:'family_redeem',code})).status,200);
  assert.equal((await post('uncle',{action:'family_redeem',code})).status,200);
  assert.equal((await pool.query('SELECT * FROM family_members')).rowCount,2);
  const get=(id,uid)=>request(app).get(`/events/${id}/entitlement`).set('Authorization',uid);
  let result=await get(1,'aunt');assert.equal(result.body.entitlement.email_limit,500);assert.equal(result.body.entitlement.plan_name,'Family Access');assert.equal(result.body.entitlement.amount_cents,0);assert.equal(result.body.entitlement.presentation,'unbranded');
  assert.equal((await get(2,'outsider')).body.entitlement.email_limit,10);
  assert.equal((await get(1,'outsider')).status,404);
  await pool.query("INSERT INTO events VALUES(4,'aunt')");assert.equal((await get(4,'aunt')).body.entitlement.email_limit,500);
  await pool.query("UPDATE event_entitlements SET email_consumed=499 WHERE event_id=1");assert.equal((await get(1,'aunt')).body.entitlement.email_remaining,1);
  const invite={eventId:1,inviterEmail:'aunt@example.com',invitedEmail:'guest@example.com',deliveryMethod:'email'};
  assert.equal((await request(app).post('/invites/create').send(invite)).status,200);
  assert.equal((await request(app).post('/invites/create').send(invite)).status,409);
  assert.equal((await request(app).post('/invites/create').send({...invite,deliveryMethod:'share_link'})).status,200);
  assert.equal((await get(1,'aunt')).body.entitlement.email_remaining,0);
  assert.equal((await pool.query('SELECT * FROM commerce_events')).rowCount,0);
  assert.equal((await post('admin',{action:'family_close'})).status,200);
  assert.equal((await post('cousin',{action:'family_redeem',code})).status,400);
  assert.equal((await request(app).get('/billing/promo-codes?family=1').set('Authorization','aunt')).body.member,true);
  assert.equal((await get(1,'aunt')).body.entitlement.email_limit,500);
  assert.equal(planFor('family_access').rank,5);assert.equal(paidPlan('family_access'),null);
 }finally{await pool.end();delete process.env.FAMILY_WEATHER_PROMO_ADMIN_UIDS;}
});
test('existing promotion box accepts family code; larger purchases and pending checkout stay intact',async()=>{
 const {pool,app}=setup();const code='FW-FAMILY-'+'A'.repeat(24);
 try{
  await pool.query('INSERT INTO family_access_codes(code_hash,created_by_uid) VALUES($1,$2)',[hash(code),'admin']);
  await pool.query("INSERT INTO events VALUES(10,'family'),(11,'family'),(12,'family'),(13,'stranger')");
  for(const id of [10,11,12,13])await request(app).get(`/events/${id}/entitlement`).set('Authorization',id===13?'stranger':'family');
  await pool.query("UPDATE event_entitlements SET status='paid',product_code='major_event_11999',email_limit=1000,amount_cents=11999,email_consumed=20 WHERE event_id=11");
  await pool.query("UPDATE event_entitlements SET pending_product_code='event_plus_599',stripe_checkout_url='https://checkout.stripe.com/example' WHERE event_id=12");
  const redeem=await request(app).post('/events/10/entitlement/promo').set('Authorization','family').send({code});assert.equal(redeem.status,200);assert.equal(redeem.body.family_access,true);
  const larger=await request(app).get('/events/11/entitlement').set('Authorization','family');assert.equal(larger.body.entitlement.product_code,'major_event_11999');assert.equal(larger.body.entitlement.amount_cents,11999);assert.equal(larger.body.entitlement.email_consumed,20);
  const pending=await request(app).get('/events/12/entitlement').set('Authorization','family');assert.equal(pending.body.entitlement.pending_product_code,'event_plus_599');assert.equal(pending.body.entitlement.product_code,'free_event');
  assert.equal((await request(app).post('/events/13/entitlement/promo').set('Authorization','family').send({code})).status,404);
 }finally{await pool.end();}
});
