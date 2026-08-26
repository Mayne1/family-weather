"use strict";

const express = require("express");

const DESIGN_IDS = new Set([
  "wedding-editorial",
  "graduation-ascent",
  "baby-botanical",
  "birthday-after-dark",
  "cookout-table",
  "park-paper",
]);

function optionalText(value, limit) {
  const text = value == null ? "" : String(value).trim();
  return text ? text.slice(0, limit) : null;
}

module.exports = function makeEventInvitationsRouter(pool, requireFirebaseUser) {
  const router = express.Router();

  // Guest-facing invitation data. Event facts are already public through the
  // token resolver; this endpoint only supplies the selected presentation.
  router.get("/events/:id/invitation", async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT event_id, design_id, headline, honoree_names, message,
                special_instructions, photo_url, created_at, updated_at
         FROM event_invitations
         WHERE event_id = $1`,
        [String(req.params.id || "").trim()]
      );
      return res.json({ ok: true, invitation: result.rows[0] || null });
    } catch (error) {
      return res.status(500).json({ ok: false, error: "invitation_fetch_failed", detail: error.message });
    }
  });

  router.put("/events/:id/invitation", requireFirebaseUser, async (req, res) => {
    const eventId = String(req.params.id || "").trim();
    const designId = String(req.body?.design_id || "").trim();
    if (!DESIGN_IDS.has(designId)) {
      return res.status(400).json({ ok: false, error: "invalid_invitation_design" });
    }

    try {
      const owner = await pool.query(
        `SELECT id FROM events WHERE id = $1 AND owner_uid = $2 LIMIT 1`,
        [eventId, req.uid]
      );
      if (!owner.rowCount) {
        return res.status(404).json({ ok: false, error: "event_not_found_or_not_owner" });
      }

      const values = [
        eventId,
        designId,
        optionalText(req.body?.headline, 120),
        optionalText(req.body?.honoree_names, 160),
        optionalText(req.body?.message, 500),
        optionalText(req.body?.special_instructions, 300),
        optionalText(req.body?.photo_url, 1000),
      ];
      const result = await pool.query(
        `INSERT INTO event_invitations
           (event_id, design_id, headline, honoree_names, message, special_instructions, photo_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (event_id) DO UPDATE SET
           design_id = EXCLUDED.design_id,
           headline = EXCLUDED.headline,
           honoree_names = EXCLUDED.honoree_names,
           message = EXCLUDED.message,
           special_instructions = EXCLUDED.special_instructions,
           photo_url = EXCLUDED.photo_url,
           updated_at = now()
         RETURNING event_id, design_id, headline, honoree_names, message,
                   special_instructions, photo_url, created_at, updated_at`,
        values
      );
      return res.json({ ok: true, invitation: result.rows[0] });
    } catch (error) {
      return res.status(500).json({ ok: false, error: "invitation_save_failed", detail: error.message });
    }
  });

  return router;
};
