'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const express = require('express');
const request = require('supertest');
const {newDb} = require('pg-mem');
const makeRouter = require('./event-timezones-router');
function setup(identity = uid => ({email:`${uid}@example.test`})) {
  const db = newDb();
  db.public.none(`CREATE TABLE events(id BIGSERIAL PRIMARY KEY,owner_uid TEXT,owner_email TEXT NOT NULL,title TEXT NOT NULL,description TEXT,location TEXT,starts_at TIMESTAMPTZ,ends_at TIMESTAMPTZ,created_at TIMESTAMPTZ DEFAULT now()); CREATE TABLE invites(token TEXT,event_id TEXT NOT NULL,expires_at TIMESTAMPTZ);`);
  db.public.none(fs.readFileSync(__dirname+'/event-timezones.sql','utf8'));
  db.public.none(fs.readFileSync(__dirname+'/event-timezones.sql','utf8'));
  const {Pool}=db.adapters.createPg(); const pool = new Pool();
  const app=express();app.use(express.json());
  app.use(makeRouter(pool,(req,res,next)=>{ const uid=req.headers.authorization; if (!uid) return res.status(401).json({ok:false});req.uid=uid;req.firebaseUser=identity(uid);next(); }));
  return {app,pool};
}
const payload={title:'Tokyo gathering',location:'Tokyo',starts_local:'2027-07-04T12:00',time_zone:'Asia/Tokyo',duration_minutes:180};
test('atomic create persists destination zone and UTC instants; legacy rows remain unchanged',async()=>{
 const {app,pool}=setup();
 await pool.query("INSERT INTO events(owner_uid,owner_email,title,starts_at) VALUES('owner','owner@example.test','Legacy','2027-07-04T12:00:00Z')");
 const made=await request(app).post('/events/zoned').set('Authorization','owner').send(payload);
 assert.equal(made.status,200);assert.equal(made.body.event.time_zone,'Asia/Tokyo');assert.equal(made.body.event.starts_at,'2027-07-04T03:00:00.000Z');assert.equal(made.body.event.ends_at,'2027-07-04T06:00:00.000Z');
 const list=await request(app).get('/events/zoned').set('Authorization','owner');assert.equal(list.body.events.length,2);const legacy=list.body.events.find(e=>e.title==='Legacy');assert.equal(legacy.time_zone,null);assert.equal(legacy.starts_at,'2027-07-04T12:00:00.000Z');
 const other=await request(app).get('/events/zoned').set('Authorization','other');assert.deepEqual(other.body.events,[]);
});
test('gaps, folds, invalid zones/durations do not create events',async()=>{
 const {app,pool}=setup();
 for(const change of [{starts_local:'2027-03-14T02:30',time_zone:'America/New_York'},{starts_local:'2027-11-07T01:30',time_zone:'America/New_York'},{time_zone:'invalid'},{duration_minutes:0}]) {
  const response=await request(app).post('/events/zoned').set('Authorization','owner').send({...payload,...change});assert.equal(response.status,400);
 }
 assert.equal((await pool.query('SELECT * FROM events')).rowCount,0);
});
test('owner-only update and token-bound guest read enforce access and hide owner identity',async()=>{
 const {app,pool}=setup();const made=await request(app).post('/events/zoned').set('Authorization','owner').send(payload);const id=made.body.event.id;
 assert.equal((await request(app).get(`/events/${id}/zoned`)).status,401);
 assert.equal((await request(app).get(`/events/${id}/zoned`).set('Authorization','other')).status,404);
 assert.equal((await request(app).put(`/events/${id}/zoned`).set('Authorization','other').send(payload)).status,404);
 const update=await request(app).put(`/events/${id}/zoned`).set('Authorization','owner').send({...payload,starts_local:'2027-07-05T13:00'});assert.equal(update.body.event.starts_at,'2027-07-05T04:00:00.000Z');
 await pool.query("INSERT INTO invites VALUES('valid',$1,'2099-01-01'),('expired',$1,'2000-01-01'),('wrong','999','2099-01-01')",[String(id)]);
 for (const token of ['expired','wrong','missing']) assert.equal((await request(app).get(`/events/${id}/zoned?token=${token}`)).status,404);
 const guest=await request(app).get(`/events/${id}/zoned?token=valid`);assert.equal(guest.status,200);assert.equal(guest.body.event.time_zone,'Asia/Tokyo');assert.equal(guest.body.event.owner_email,undefined);assert.equal(guest.body.event.owner_uid,undefined);
});

test('missing, blank, and non-string identity emails reject before any database query', async()=>{
 for (const identity of [undefined, {}, {email:null}, {email:''}, {email:'   '}, {email:42}, {email:false}, {email:['owner@example.test']}, {email:{address:'owner@example.test'}}]) {
  const {app,pool}=setup(()=>identity);
  let queries=0;
  const query=pool.query.bind(pool);
  pool.query=(...args)=>{queries++;return query(...args);};
  const result=await request(app).post('/events/zoned').set('Authorization','owner').send(payload);
  assert.equal(result.status,400);
  assert.equal(result.body.error,'account_email_required');
  assert.equal(queries,0,'invalid account email must be rejected before querying');
  assert.equal((await query('SELECT * FROM events')).rowCount,0);
 }
});
test('valid identity email is trimmed and stored, not taken from request body', async()=>{
 const {app}=setup(()=>({email:'  owner@example.test  '}));
 const result=await request(app).post('/events/zoned').set('Authorization','owner').send({...payload,owner_email:'attacker@example.test'});
 assert.equal(result.status,200);
 assert.equal(result.body.event.owner_email,'owner@example.test');
});
