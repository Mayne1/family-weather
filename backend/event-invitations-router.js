"use strict";

const express = require("express");

const DESIGN_IDS = new Set([
  "wedding-editorial",
  "graduation-ascent",
  "baby-botanical",
  "birthday-after-dark",
  "cookout-table",
  "park-paper",
  "wedding-blush-cascade",
  "wedding-white-garden",
  "wedding-midnight-crest",
  "wedding-candlelit-wood",
  "wedding-marble-rose",
  "wedding-burgundy-bloom",
  "wedding-torn-paper",
  "wedding-sunset-vows",
  "wedding-ink-marble",
  "wedding-deco-noir",
]);
const ARTWORK_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_ARTWORK_BYTES = 8 * 1024 * 1024;

function optionalText(value, limit) {
  const text = value == null ? "" : String(value).trim();
  return text ? text.slice(0, limit) : null;
}

function readArtwork(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_ARTWORK_BYTES) tooLarge = true;
      else chunks.push(chunk);
    });
    req.on("end", () => tooLarge ? reject(Object.assign(new Error("artwork_too_large"), { status: 413 })) : resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function artworkMatchesMime(artwork, mime) {
  if (mime === "image/jpeg") return artwork.length >= 3 && artwork[0] === 0xff && artwork[1] === 0xd8 && artwork[2] === 0xff;
  if (mime === "image/png") return artwork.length >= 8 && artwork.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === "image/webp") return artwork.length >= 12 && artwork.toString("ascii", 0, 4) === "RIFF" && artwork.toString("ascii", 8, 12) === "WEBP";
  return false;
}

async function ownsEvent(pool, eventId, uid) {
  const owner = await pool.query(
    `SELECT id FROM events WHERE id = $1 AND owner_uid = $2 LIMIT 1`,
    [eventId, uid]
  );
  return Boolean(owner.rowCount);
}

module.exports = function makeEventInvitationsRouter(pool, requireFirebaseUser) {
  const router = express.Router();

  // Guest-facing invitation data. Event facts are already public through the
  // token resolver; this endpoint only supplies the selected presentation.
  router.get("/events/:id/invitation", async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT event_id, design_id, headline, honoree_names, message,
                special_instructions, photo_url,
                (artwork_data IS NOT NULL) AS has_custom_artwork,
                artwork_mime, created_at, updated_at
         FROM event_invitations
         WHERE event_id = $1`,
        [String(req.params.id || "").trim()]
      );
      return res.json({ ok: true, invitation: result.rows[0] || null });
    } catch (error) {
      console.error("invitation_fetch_failed", error);
      return res.status(500).json({ ok: false, error: "invitation_fetch_failed" });
    }
  });

  router.get("/events/:id/invitation/artwork", async (req, res) => {
    try {
      const token = String(req.query.token || "").trim();
      if (!token) return res.status(404).end();
      const result = await pool.query(
        `SELECT invitation.artwork_data, invitation.artwork_mime
         FROM event_invitations invitation
         JOIN invites invite ON invite.event_id = invitation.event_id
         WHERE invitation.event_id = $1 AND invite.token = $2
           AND invite.expires_at > now() AND invitation.artwork_data IS NOT NULL`,
        [String(req.params.id || "").trim(), token]
      );
      if (!result.rowCount) return res.status(404).end();
      res.set("Content-Type", result.rows[0].artwork_mime);
      res.set("Cache-Control", "private, max-age=3600");
      return res.send(result.rows[0].artwork_data);
    } catch (error) {
      console.error("invitation_artwork_fetch_failed", error);
      return res.status(500).end();
    }
  });

  router.put("/events/:id/invitation/artwork", requireFirebaseUser, async (req, res) => {
    const eventId = String(req.params.id || "").trim();
    const mime = String(req.headers["content-type"] || "").split(";", 1)[0].toLowerCase();
    if (!ARTWORK_TYPES.has(mime)) {
      return res.status(415).json({ ok: false, error: "invalid_artwork_type" });
    }
    const declaredSize = Number(req.headers["content-length"] || 0);
    if (declaredSize > MAX_ARTWORK_BYTES) {
      return res.status(413).json({ ok: false, error: "artwork_too_large" });
    }

    try {
      if (!(await ownsEvent(pool, eventId, req.uid))) {
        return res.status(404).json({ ok: false, error: "event_not_found_or_not_owner" });
      }
      const artwork = await readArtwork(req);
      if (!artwork.length) return res.status(400).json({ ok: false, error: "artwork_required" });
      if (!artworkMatchesMime(artwork, mime)) {
        return res.status(415).json({ ok: false, error: "invalid_artwork_type" });
      }
      const result = await pool.query(
        `UPDATE event_invitations
         SET artwork_data = $2, artwork_mime = $3, photo_url = 'stored', updated_at = now()
         WHERE event_id = $1
         RETURNING event_id, artwork_mime, updated_at`,
        [eventId, artwork, mime]
      );
      if (!result.rowCount) return res.status(409).json({ ok: false, error: "save_invitation_before_artwork" });
      return res.json({ ok: true, has_custom_artwork: true, artwork_mime: mime });
    } catch (error) {
      const status = Number(error?.status || 500);
      if (status === 413) return res.status(413).json({ ok: false, error: "artwork_too_large" });
      console.error("invitation_artwork_save_failed", error);
      return res.status(500).json({ ok: false, error: "invitation_artwork_save_failed" });
    }
  });

  router.delete("/events/:id/invitation/artwork", requireFirebaseUser, async (req, res) => {
    const eventId = String(req.params.id || "").trim();
    try {
      if (!(await ownsEvent(pool, eventId, req.uid))) {
        return res.status(404).json({ ok: false, error: "event_not_found_or_not_owner" });
      }
      await pool.query(
        `UPDATE event_invitations
         SET artwork_data = NULL, artwork_mime = NULL, photo_url = NULL, updated_at = now()
         WHERE event_id = $1`,
        [eventId]
      );
      return res.json({ ok: true, has_custom_artwork: false });
    } catch (error) {
      console.error("invitation_artwork_delete_failed", error);
      return res.status(500).json({ ok: false, error: "invitation_artwork_delete_failed" });
    }
  });

  router.put("/events/:id/invitation", requireFirebaseUser, async (req, res) => {
    const eventId = String(req.params.id || "").trim();
    const designId = String(req.body?.design_id || "").trim();
    if (!DESIGN_IDS.has(designId)) {
      return res.status(400).json({ ok: false, error: "invalid_invitation_design" });
    }

    try {
      if (!(await ownsEvent(pool, eventId, req.uid))) {
        return res.status(404).json({ ok: false, error: "event_not_found_or_not_owner" });
      }

      const values = [
        eventId,
        designId,
        optionalText(req.body?.headline, 120),
        optionalText(req.body?.honoree_names, 160),
        optionalText(req.body?.message, 500),
        optionalText(req.body?.special_instructions, 300),
        null,
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
           updated_at = now()
         RETURNING event_id, design_id, headline, honoree_names, message,
                   special_instructions, photo_url,
                   (artwork_data IS NOT NULL) AS has_custom_artwork,
                   artwork_mime, created_at, updated_at`,
        values
      );
      return res.json({ ok: true, invitation: result.rows[0] });
    } catch (error) {
      console.error("invitation_save_failed", error);
      return res.status(500).json({ ok: false, error: "invitation_save_failed" });
    }
  });

  return router;
};
