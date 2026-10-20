'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const express=require('express'),request=require('supertest'),{newDb}=require('pg-mem');
const crypto=require('crypto'),fs=require('fs');
const router=require('./announcements-router');
test('announcement privacy, free replies, verified purchases, and SMS accounting',async()=>{
 const db=newDb();db.public.none(fs.readFileSync(__dirname+'/announcements.sql','utf8'));const {Pool}=db.adapters.createPg();const pool=new Pool();
 const app=express();app.use(express.json());app.use(router(pool,(req,res,next)=>{req.uid=req.headers.authorization;if(!req.uid)return res.status(401).json({error:'Sign in'});next()}));
 const original=global.fetch;const keys=['FW_SMS_ENABLED','BREVO_API_KEY','BREVO_SMS_SENDER','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET'];const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));keys.forEach(k=>process.env[k]=k==='FW_SMS_ENABLED'?'true':'test-only');
 let sends=0,provider='accepted';
 global.fetch=async url=>{if(String(url).includes('brevo')){sends++;if(provider==='timeout')throw Error('timeout');return new Response(JSON.stringify(provider==='accepted'?{messageId:1}:{error:'rejected'}),{status:provider==='accepted'?201:400});}throw Error('Unexpected network request')};
 try{
  const created=await request(app).post('/announcements').set('Authorization','owner').send({title:'Family update',message:'Private family news',theme:'forest'});assert.equal(created.status,200);const id=created.body.id;
  assert.equal((await request(app).post('/announcements').send({})).status,401);
  const publicPage=await request(app).get('/announcements/'+id);assert.equal(publicPage.status,200);assert.equal(publicPage.body.announcement.owner_uid,undefined);
  assert.equal((await request(app).post(`/announcements/${id}/replies`).send({name:'Auntie',message:'Thinking of you'})).status,200);
  assert.equal((await request(app).get(`/announcements/${id}/manage`).set('Authorization','stranger')).status,404);
  assert.equal((await request(app).get(`/announcements/${id}/manage`).set('Authorization','owner')).body.replies.length,1);
  const order=crypto.randomUUID();await pool.query('INSERT INTO fw_sms_orders(id,owner_uid,announcement_id,session_id) VALUES($1,$2,$3,$4)',[order,'owner',id,'cs_test']);
  const session={id:'cs_test',metadata:{fw_sms_order:order},mode:'payment',payment_status:'paid',currency:'usd',amount_total:99};
  const payload=JSON.stringify({type:'checkout.session.completed',data:{object:session}});const t=Math.floor(Date.now()/1000);const signature=`t=${t},v1=${crypto.createHmac('sha256','test-only').update(`${t}.${payload}`).digest('hex')}`;
  assert.equal((await request(app).post('/billing/stripe-webhook').send({payload,signature:'bad'})).status,400);
  for(let i=0;i<2;i++)assert.equal((await request(app).post('/billing/stripe-webhook').send({payload,signature})).status,200);
  const balance=async()=>Number((await pool.query('SELECT balance FROM fw_sms_wallets WHERE owner_uid=$1',['owner'])).rows[0].balance);
  assert.equal(await balance(),10);
  const send=recipient=>request(app).post(`/announcements/${id}/sms`).set('Authorization','owner').send({recipient,consent:true,request_id:crypto.randomUUID()});
  assert.equal((await send('2095550123')).body.status,'accepted');assert.equal(await balance(),9);
  assert.equal((await send('2095550123')).body.repeated,true);assert.equal(sends,1);assert.equal(await balance(),9);
  provider='rejected';assert.equal((await send('2095550124')).body.status,'rejected');assert.equal(await balance(),9);
  provider='timeout';assert.equal((await send('2095550125')).body.status,'unknown');assert.equal(await balance(),8);
  assert.equal((await send('2095550125')).body.repeated,true);assert.equal(sends,3);
  await request(app).post(`/announcements/${id}/close`).set('Authorization','owner').send({});
  assert.equal((await request(app).get('/announcements/'+id)).status,404);
  assert.equal((await request(app).post(`/announcements/${id}/replies`).send({name:'Late',message:'Hi'})).status,404);
 }finally{global.fetch=original;for(const k of keys)if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];await pool.end()}
});
