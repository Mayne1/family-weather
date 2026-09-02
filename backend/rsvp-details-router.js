"use strict";

const express = require("express");

module.exports = function makeRsvpDetailsRouter(pool, requireFirebaseUser) {
  const router = express.Router();

  router.get("/events/:id/rsvp-details", requireFirebaseUser, async (req, res) => {
    const eventId = String(req.params.id || "").trim().slice(0, 40);
    try {
      const owner = await pool.query(
        "SELECT id FROM events WHERE id = $1 AND owner_uid = $2 LIMIT 1",
        [eventId, req.uid]
      );
      if (!owner.rowCount) return res.status(404).json({ ok: false, error: "event_not_found_or_not_owner" });

      const result = await pool.query(
        `SELECT i.token,i.invited_email,i.created_at,i.opened_at,i.responded_at,i.response,i.responder_name,i.guests_count,i.message,'invitation' AS source
         FROM invites i LEFT JOIN event_entitlements e ON e.event_id=i.event_id
         WHERE i.event_id=$1 AND i.token<>COALESCE(e.share_invite_token,'')
         UNION ALL
         SELECT 'share-'||s.id::text,s.responder_email,s.created_at,s.responded_at,s.responded_at,s.response,s.responder_name,s.guests_count,s.message,'share_link'
         FROM share_link_rsvps s WHERE s.event_id=$1
         ORDER BY created_at DESC`,
        [eventId]
      );
      return res.json({ ok: true, details: result.rows });
    } catch (error) {
      console.error("rsvp_details_fetch_failed", error);
      return res.status(500).json({ ok: false, error: "rsvp_details_fetch_failed" });
    }
  });

  return router;
};
