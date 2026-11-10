'use strict';
const express = require('express');
const { zonedLocalToISO } = require('./event-time');
const fields = 'id, owner_uid, owner_email, title, description, location, starts_at, ends_at, time_zone, created_at';
function times(body) {
  const starts_at = zonedLocalToISO(body.starts_local, body.time_zone);
  const minutes = body.duration_minutes;
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 10080) throw new Error('Choose a duration between one minute and seven days.');
  return { starts_at, ends_at: new Date(Date.parse(starts_at) + minutes * 60000).toISOString() };
}
module.exports = function makeEventTimezonesRouter(pool, requireFirebaseUser) {
  const router = express.Router();
  router.post('/events/zoned', requireFirebaseUser, async (req,res) => {
    const body = req.body || {};
    const ownerEmail = typeof req.firebaseUser?.email === 'string' ? req.firebaseUser.email.trim() : '';
    if (!ownerEmail) return res.status(400).json({ok:false,error:'account_email_required',message:'Sign in with an account that has an email address before creating an event.'});
    if (!String(body.title || '').trim()) return res.status(400).json({ ok:false,error:'missing_fields',need:['title'] });
    let time;
    try { time = times(body); } catch (error) { return res.status(400).json({ok:false,error:error.message}); }
    try {
      const result = await pool.query(`INSERT INTO events (owner_uid, owner_email, title, description, location, starts_at, ends_at, time_zone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${fields}`,
        [req.uid, ownerEmail, body.title, body.description ?? null, body.location ?? null, time.starts_at, time.ends_at, body.time_zone]);
      return res.json({ok:true,event:result.rows[0]});
    } catch (error) { console.error('zoned_event_create_failed',error); return res.status(500).json({ok:false,error:'event_create_failed'}); }
  });
  router.get('/events/zoned', requireFirebaseUser, async (req,res) => {
    try {
      const result = await pool.query(`SELECT ${fields} FROM events WHERE owner_uid=$1 ORDER BY created_at DESC LIMIT 100`,[req.uid]);
      return res.json({ok:true,events:result.rows});
    } catch (error) { console.error('zoned_events_fetch_failed',error); return res.status(500).json({ok:false,error:'events_unavailable'}); }
  });
  router.get('/events/:id/zoned', (req,res,next) => req.query.token ? next() : requireFirebaseUser(req,res,next), async (req,res) => {
    try {
      const token = typeof req.query.token === 'string' ? req.query.token : '';
      // Only a live invitation token for this exact event grants guest access.
      if (token) {
        const invite = await pool.query('SELECT token FROM invites WHERE event_id=$1 AND token=$2 AND expires_at > now()',[String(req.params.id),token]);
        if (!invite.rowCount) return res.status(404).json({ok:false,error:'invitation_unavailable'});
      }
      const result = await pool.query(`SELECT ${fields} FROM events WHERE id=$1${token ? '' : ' AND owner_uid=$2'}`,token ? [req.params.id] : [req.params.id,req.uid]);
      if (!result.rowCount) return res.status(404).json({ok:false,error:'event_not_found_or_not_owner'});
      const event = result.rows[0];
      if (token) { delete event.owner_uid; delete event.owner_email; }
      return res.json({ok:true,event});
    } catch (error) { console.error('zoned_event_fetch_failed',error); return res.status(500).json({ok:false,error:'event_unavailable'}); }
  });
  router.put('/events/:id/zoned', requireFirebaseUser, async (req,res) => {
    let time;
    try { time = times(req.body || {}); } catch (error) { return res.status(400).json({ok:false,error:error.message}); }
    try {
      const result = await pool.query(`UPDATE events SET starts_at=$1, ends_at=$2, time_zone=$3 WHERE id=$4 AND owner_uid=$5 RETURNING ${fields}`, [time.starts_at,time.ends_at,req.body.time_zone,req.params.id,req.uid]);
      if (!result.rowCount) return res.status(404).json({ok:false,error:'event_not_found_or_not_owner'});
      return res.json({ok:true,event:result.rows[0]});
    } catch (error) { console.error('zoned_event_update_failed',error); return res.status(500).json({ok:false,error:'event_update_failed'}); }
  });
  return router;
};
