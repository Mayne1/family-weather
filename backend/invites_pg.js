"use strict";

const express = require("express");
const crypto = require("crypto");

module.exports = function makeInvitesRouter(pool) {
  const router = express.Router();
  const inviteToken = () => crypto.randomBytes(24).toString("base64url");
  const hoursFromNow = (hours) => new Date(Date.now() + hours * 3600 * 1000);

  function normalizeInvite(row) {
    if (!row) return row;
    return {
      token: row.token,
      eventId: row.event_id,
      inviterEmail: row.inviter_email,
      invitedEmail: row.invited_email,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      openedAt: row.opened_at,
      respondedAt: row.responded_at,
      response: row.response,
      responderName: row.responder_name,
      guestsCount: row.guests_count,
      message: row.message,
    };
  }

  router.get("/health", (_req, res) => res.json({ ok: true }));

  router.post("/create", async (req, res) => {
    try {
      const { eventId, inviterEmail, invitedEmail, expiresHours } = req.body || {};
      if (!eventId) return res.status(400).json({ ok: false, error: "missing_eventId" });
      if (!inviterEmail) return res.status(400).json({ ok: false, error: "missing_inviterEmail" });
      const token = inviteToken();
      const expiresAt = hoursFromNow(Number(expiresHours || 72));
      await pool.query(
        `INSERT INTO invites(token,event_id,inviter_email,invited_email,expires_at)
         VALUES($1,$2,$3,$4,$5)`,
        [token, String(eventId), String(inviterEmail), invitedEmail ? String(invitedEmail) : null, expiresAt]
      );
      return res.json({ ok: true, token, eventId: String(eventId), expiresAt: expiresAt.toISOString() });
    } catch (error) {
      console.error("invite_create_failed", error);
      return res.status(500).json({ ok: false, error: "invite_create_failed" });
    }
  });

  router.get("/resolve", async (req, res) => {
    try {
      const token = String(req.query.token || "").trim();
      if (!token) return res.status(400).json({ ok: false, error: "missing_token" });
      const result = await pool.query(
        `SELECT token,event_id,inviter_email,invited_email,created_at,expires_at,
                opened_at,responded_at,response,responder_name,guests_count,message
         FROM invites WHERE token=$1`,
        [token]
      );
      if (!result.rowCount) return res.status(404).json({ ok: false, error: "token_not_found" });
      const row = result.rows[0];
      if (new Date(row.expires_at).getTime() < Date.now()) {
        return res.status(410).json({ ok: false, error: "token_expired", expiresAt: row.expires_at });
      }
      await pool.query("UPDATE invites SET opened_at = COALESCE(opened_at, now()) WHERE token=$1", [token]);
      return res.json({ ok: true, invite: normalizeInvite(row) });
    } catch (error) {
      console.error("invite_resolve_failed", error);
      return res.status(500).json({ ok: false, error: "invite_resolve_failed" });
    }
  });

  router.post("/respond", async (req, res) => {
    try {
      const { token, response, responderEmail, responderName, guestsCount, message } = req.body || {};
      const value = String(token || "").trim();
      const answer = String(response || "").toLowerCase().trim();
      const name = String(responderName || "").trim().slice(0, 160);
      const guests = Math.max(0, Math.min(50, Math.trunc(Number(guestsCount) || 0)));
      const note = String(message || "").trim().slice(0, 1000) || null;
      if (!value) return res.status(400).json({ ok: false, error: "missing_token" });
      if (!name) return res.status(400).json({ ok: false, error: "missing_responder_name" });
      if (!["yes", "maybe", "no"].includes(answer)) return res.status(400).json({ ok: false, error: "bad_response" });

      const existing = await pool.query("SELECT token,expires_at FROM invites WHERE token=$1", [value]);
      if (!existing.rowCount) return res.status(404).json({ ok: false, error: "token_not_found" });
      if (new Date(existing.rows[0].expires_at).getTime() < Date.now()) {
        return res.status(410).json({ ok: false, error: "token_expired", expiresAt: existing.rows[0].expires_at });
      }

      await pool.query(
        `UPDATE invites SET responded_at=now(), response=$2,
          invited_email=COALESCE(invited_email,$3), responder_name=$4,
          guests_count=$5, message=$6 WHERE token=$1`,
        [value, answer, responderEmail ? String(responderEmail).trim() : null, name, guests, note]
      );
      return res.json({ ok: true, token: value, response: answer });
    } catch (error) {
      console.error("invite_response_failed", error);
      return res.status(500).json({ ok: false, error: "invite_response_failed" });
    }
  });

  router.post("/send-sms", async (req, res) => {
    try {
      const { eventId, eventTitle, message, invites } = req.body || {};
      if (!Array.isArray(invites) || !invites.length) {
        return res.status(400).json({ ok: false, error: "invites_required" });
      }
      const results = invites.map((invite) => {
        const phone = String(invite?.phone || "").trim();
        const token = String(invite?.token || "").trim();
        const link = String(invite?.link || "").trim();
        if (!phone || !link) return { phone, token, ok: false, error: "invalid_invite_row" };
        return {
          phone,
          token,
          ok: false,
          error: "sender_not_wired",
          preview: String(message || "").trim() || `You're invited to ${eventTitle || "an event"} on Family Weather. RSVP: ${link}`,
        };
      });
      return res.json({ ok: true, eventId: eventId || null, total: results.length, sent: 0, failed: results.length, results });
    } catch (error) {
      console.error("invite_sms_failed", error);
      return res.status(500).json({ ok: false, error: "server_error" });
    }
  });
  return router;
};
