"use strict";

const express = require("express");
const { createHash } = require("crypto");

const STATE_HASH = /^[a-f0-9]{64}$/;
const DESIGN_ID = /^[A-Za-z0-9_-]{4,100}$/;
const MAX_PAYLOAD_LENGTH = 20000;
const MAX_ARTWORK_BYTES = 8 * 1024 * 1024;

function capabilityHash(req) {
  const value = String(req.headers["x-canva-job-key"] || "");
  return value ? createHash("sha256").update(value).digest("hex") : "";
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
    req.on("end", () => tooLarge
      ? reject(Object.assign(new Error("artwork_too_large"), { status: 413 }))
      : resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function isPng(value) {
  return value.length >= 8 && value.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

module.exports = function makeCanvaJobsRouter(pool, requireFirebaseUser) {
  const router = express.Router();

  router.post("/events/:id/canva-job", requireFirebaseUser, async (req, res) => {
    const eventId = String(req.params.id || "").trim();
    const stateHash = String(req.body?.state_hash || "").trim();
    const jobCapabilityHash = String(req.body?.capability_hash || "").trim();
    const encryptedPayload = String(req.body?.encrypted_payload || "");
    if (!STATE_HASH.test(stateHash) || !STATE_HASH.test(jobCapabilityHash) || !encryptedPayload || encryptedPayload.length > MAX_PAYLOAD_LENGTH) {
      return res.status(400).json({ ok: false, error: "invalid_canva_job" });
    }

    try {
      const owner = await pool.query(
        `SELECT id, title FROM events WHERE id = $1 AND owner_uid = $2 LIMIT 1`,
        [eventId, req.uid]
      );
      if (!owner.rowCount) return res.status(404).json({ ok: false, error: "event_not_found_or_not_owner" });
      await pool.query(`DELETE FROM canva_invitation_jobs WHERE expires_at <= now()`);
      await pool.query(
        `INSERT INTO canva_invitation_jobs
           (state_hash, event_id, owner_uid, event_title, capability_hash, encrypted_payload)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [stateHash, eventId, req.uid, String(owner.rows[0].title || "Family Weather invitation").slice(0, 200), jobCapabilityHash, encryptedPayload]
      );
      return res.json({ ok: true });
    } catch (error) {
      console.error("canva_job_create_failed", error);
      return res.status(500).json({ ok: false, error: "canva_job_create_failed" });
    }
  });

  // These are capability endpoints used only by Family Weather's server-side
  // Canva callbacks. The 256-bit state itself is never stored; only its hash is.
  router.get("/canva-jobs/:stateHash", async (req, res) => {
    const stateHash = String(req.params.stateHash || "").trim();
    if (!STATE_HASH.test(stateHash)) return res.status(404).json({ ok: false, error: "canva_job_not_found" });
    try {
      const result = await pool.query(
        `SELECT event_id, event_title, encrypted_payload, design_id, status, expires_at
         FROM canva_invitation_jobs
         WHERE state_hash = $1 AND expires_at > now()
         LIMIT 1`,
        [stateHash]
      );
      if (!result.rowCount) return res.status(404).json({ ok: false, error: "canva_job_not_found" });
      return res.json({ ok: true, job: result.rows[0] });
    } catch (error) {
      console.error("canva_job_fetch_failed", error);
      return res.status(500).json({ ok: false, error: "canva_job_fetch_failed" });
    }
  });

  router.patch("/canva-jobs/:stateHash", async (req, res) => {
    const stateHash = String(req.params.stateHash || "").trim();
    const encryptedPayload = String(req.body?.encrypted_payload || "");
    const designId = String(req.body?.design_id || "").trim();
    const status = String(req.body?.status || "").trim();
    const jobCapabilityHash = capabilityHash(req);
    if (!STATE_HASH.test(stateHash) || !STATE_HASH.test(jobCapabilityHash) || !encryptedPayload || encryptedPayload.length > MAX_PAYLOAD_LENGTH || !DESIGN_ID.test(designId) || status !== "editing") {
      return res.status(400).json({ ok: false, error: "invalid_canva_job_update" });
    }
    try {
      const result = await pool.query(
        `UPDATE canva_invitation_jobs
         SET encrypted_payload = $2, design_id = $3, status = 'editing', updated_at = now()
         WHERE state_hash = $1 AND capability_hash = $4 AND status = 'authorizing' AND expires_at > now()
         RETURNING event_id`,
        [stateHash, encryptedPayload, designId, jobCapabilityHash]
      );
      if (!result.rowCount) return res.status(409).json({ ok: false, error: "canva_job_not_available" });
      return res.json({ ok: true, event_id: result.rows[0].event_id });
    } catch (error) {
      console.error("canva_job_update_failed", error);
      return res.status(500).json({ ok: false, error: "canva_job_update_failed" });
    }
  });

  router.post("/canva-jobs/:stateHash/artwork", async (req, res) => {
    const stateHash = String(req.params.stateHash || "").trim();
    const designId = String(req.headers["x-canva-design-id"] || "").trim();
    const jobCapabilityHash = capabilityHash(req);
    if (!STATE_HASH.test(stateHash) || !STATE_HASH.test(jobCapabilityHash) || !DESIGN_ID.test(designId) || String(req.headers["content-type"] || "").split(";", 1)[0] !== "image/png") {
      return res.status(400).json({ ok: false, error: "invalid_canva_artwork" });
    }
    try {
      const artwork = await readArtwork(req);
      if (!artwork.length || !isPng(artwork)) return res.status(415).json({ ok: false, error: "invalid_canva_artwork" });
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const job = await client.query(
          `SELECT event_id FROM canva_invitation_jobs
           WHERE state_hash = $1 AND design_id = $2 AND capability_hash = $3 AND status = 'editing'
             AND consumed_at IS NULL AND expires_at > now()
           FOR UPDATE`,
          [stateHash, designId, jobCapabilityHash]
        );
        if (!job.rowCount) {
          await client.query("ROLLBACK");
          return res.status(409).json({ ok: false, error: "canva_job_not_available" });
        }
        const saved = await client.query(
          `UPDATE event_invitations
           SET artwork_data = $2, artwork_mime = 'image/png', photo_url = 'stored', updated_at = now()
           WHERE event_id = $1
           RETURNING event_id`,
          [job.rows[0].event_id, artwork]
        );
        if (!saved.rowCount) {
          await client.query("ROLLBACK");
          return res.status(409).json({ ok: false, error: "save_invitation_before_artwork" });
        }
        await client.query(
          `UPDATE canva_invitation_jobs
           SET status = 'completed', consumed_at = now(), encrypted_payload = '', updated_at = now()
           WHERE state_hash = $1`,
          [stateHash]
        );
        await client.query("COMMIT");
        return res.json({ ok: true, event_id: job.rows[0].event_id });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      if (Number(error?.status) === 413) return res.status(413).json({ ok: false, error: "artwork_too_large" });
      console.error("canva_artwork_save_failed", error);
      return res.status(500).json({ ok: false, error: "canva_artwork_save_failed" });
    }
  });

  return router;
};
