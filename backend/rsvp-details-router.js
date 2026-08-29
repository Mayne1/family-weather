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
        `SELECT token, responder_name, guests_count, message
         FROM invites WHERE event_id = $1`,
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
