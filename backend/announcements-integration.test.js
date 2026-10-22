'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const express=require('express'),request=require('supertest'),{newDb}=require('pg-mem');
const fs=require('fs');const router=require('./announcements-router');
test('free announcements keep private management and replies; retired purchase and send routes cannot act',async()=>{
 const db=newDb();db.public.none(fs.readFileSync(__dirname+'/announcements.sql','utf8'));const {Pool}=db.adapters.createPg();const pool=new Pool();
 const app=express();app.use(express.json());app.use(router(pool,(req,res,next)=>{req.uid=req.headers.authorization;if(!req.uid)return res.status(401).json({error:'Sign in'});next()}));
 const original=global.fetch;let externalCalls=0;global.fetch=async()=>{externalCalls++;throw Error('No external delivery or payment requests expected')};
 try{
  const created=await request(app).post('/announcements').set('Authorization','owner').send({title:'Family update',message:'Private family news',theme:'forest'});assert.equal(created.status,200);const id=created.body.id;
  assert.equal((await request(app).post('/announcements').send({})).status,401);
  const listing=await request(app).get('/announcements').set('Authorization','owner');assert.equal(listing.body.announcements.length,1);assert.equal(listing.body.balance,undefined);assert.equal(listing.body.sms_ready,undefined);
  const publicPage=await request(app).get('/announcements/'+id);assert.equal(publicPage.status,200);assert.equal(publicPage.body.announcement.owner_uid,undefined);
  assert.equal((await request(app).post(`/announcements/${id}/replies`).send({name:'Auntie',message:'Thinking of you'})).status,200);
  assert.equal((await request(app).get(`/announcements/${id}/manage`).set('Authorization','stranger')).status,404);
  const manage=await request(app).get(`/announcements/${id}/manage`).set('Authorization','owner');assert.equal(manage.body.replies.length,1);assert.equal(manage.body.sends,undefined);
  for(const path of [`${id}/sms`,`${id}/checkout`,'payments/refresh','sms-channel','sms-signup/old-token','sms-preferences/old-token','sms-webhook'])assert.equal((await request(app).post('/announcements/'+path).set('Authorization','owner').send({recipient:'2095550123',consent:true})).status,404);
  assert.equal(externalCalls,0);
  assert.equal((await request(app).post(`/announcements/${id}/close`).set('Authorization','stranger').send({})).status,404);
  assert.equal((await request(app).post(`/announcements/${id}/close`).set('Authorization','owner').send({})).status,200);
  assert.equal((await request(app).get('/announcements/'+id)).status,404);
  assert.equal((await request(app).post(`/announcements/${id}/replies`).send({name:'Late',message:'Hi'})).status,404);
 }finally{global.fetch=original;await pool.end()}
});
