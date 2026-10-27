"use strict";
const express=require('express');
const {queueReply}=require('./push-notifications');
const crypto=require('crypto');
const uid=()=>crypto.randomBytes(16).toString('hex');
const error=(res,status,message)=>res.status(status).json({ok:false,error:message});
module.exports=function makeAnnouncementsRouter(pool,auth){
 const r=express.Router();
 const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(e=>{console.error('announcements:',e.message);error(res,503,'The announcement service is temporarily unavailable. Please try again.');});
 const owned=async(req)=> (await pool.query('SELECT * FROM fw_announcements WHERE id=$1 AND owner_uid=$2',[req.params.id,req.uid])).rows[0];
 const limits=new Map();
 function limit(req,res,next){const key=req.uid||req.ip;const now=Date.now();if(limits.size>10000)for(const[k,v]of limits)if(v.until<now)limits.delete(k);let v=limits.get(key);if(!v||v.until<now)v={count:0,until:now+60000};v.count++;limits.set(key,v);if(v.count>20)return error(res,429,'Please wait a minute before trying again.');next();}

 r.get('/announcements',auth,wrap(async(req,res)=>{
  const items=await pool.query('SELECT id,title,theme,closed,created_at FROM fw_announcements WHERE owner_uid=$1 ORDER BY created_at DESC LIMIT 100',[req.uid]);
  res.json({ok:true,announcements:items.rows});
 }));
 r.post('/announcements',auth,limit,wrap(async(req,res)=>{
  const {title,message,theme}=req.body||{};
  if(typeof title!=='string'||!title.trim()||title.length>120||typeof message!=='string'||!message.trim()||message.length>4000||!['forest','sunrise','evening','blush','rainbow','autumn','golden','coastal','meadow'].includes(theme))return error(res,400,'Add a title and message, and choose a design.');
  const id=uid();await pool.query('INSERT INTO fw_announcements(id,owner_uid,title,message,theme) VALUES($1,$2,$3,$4,$5)',[id,req.uid,title.trim(),message.trim(),theme]);res.json({ok:true,id});
 }));
 r.get('/announcements/:id',wrap(async(req,res)=>{
  const q=await pool.query('SELECT id,title,message,theme,closed,created_at FROM fw_announcements WHERE id=$1',[req.params.id]);if(!q.rowCount||q.rows[0].closed)return error(res,404,'This announcement is unavailable.');res.json({ok:true,announcement:q.rows[0]});
 }));
 r.post('/announcements/:id/replies',limit,wrap(async(req,res)=>{
  const {name,message,website}=req.body||{};if(website)return error(res,400,'Reply could not be saved.');
  if(typeof name!=='string'||!name.trim()||name.length>80||typeof message!=='string'||!message.trim()||message.length>2000)return error(res,400,'Enter your name and a message (up to 2,000 characters).');
  const client=await pool.connect();
  try {
  await client.query('BEGIN');
  const q=await client.query('INSERT INTO fw_announcement_replies(announcement_id,name,message) SELECT id,$2,$3 FROM fw_announcements WHERE id=$1 AND closed=false RETURNING id',[req.params.id,name.trim(),message.trim()]);
  if(!q.rowCount){await client.query('ROLLBACK');return error(res,404,'This announcement is unavailable.');}
  await queueReply(client,'announcement',req.params.id);
  await client.query('COMMIT');res.json({ok:true});
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }));
 r.get('/announcements/:id/manage',auth,wrap(async(req,res)=>{
  const a=await owned(req);if(!a)return error(res,404,'Announcement not found.');
  const replies=await pool.query('SELECT id,name,message,created_at FROM fw_announcement_replies WHERE announcement_id=$1 ORDER BY created_at DESC LIMIT 500',[a.id]);
  res.json({ok:true,announcement:a,replies:replies.rows});
 }));
 r.post('/announcements/:id/close',auth,wrap(async(req,res)=>{const a=await owned(req);if(!a)return error(res,404,'Announcement not found.');await pool.query('UPDATE fw_announcements SET closed=true WHERE id=$1',[a.id]);res.json({ok:true});}));
 return r;
};
