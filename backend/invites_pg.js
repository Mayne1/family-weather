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
    let client;
    try {
      client = await pool.connect();
      const { eventId, inviterEmail, invitedEmail, expiresHours, deliveryMethod } = req.body || {};
      if (!eventId) return res.status(400).json({ ok: false, error: "missing_eventId" });
      if (!inviterEmail) return res.status(400).json({ ok: false, error: "missing_inviterEmail" });
      const method = String(deliveryMethod || "").trim();
      if (!["email", "share_link"].includes(method)) return res.status(400).json({ ok: false, error: "invalid_delivery_method" });
      if (method === "email" && !invitedEmail) return res.status(400).json({ ok: false, error: "missing_invitedEmail" });

      await client.query("BEGIN");
      const entitlementResult = await client.query("SELECT * FROM event_entitlements WHERE event_id=$1 FOR UPDATE", [String(eventId)]);
      if (!entitlementResult.rowCount) { await client.query("ROLLBACK"); return res.status(402).json({ ok: false, error: "event_purchase_required" }); }
      const entitlement = entitlementResult.rows[0];
      const legacy = entitlement.status === "legacy";
      if (!legacy && entitlement.status !== "paid") { await client.query("ROLLBACK"); return res.status(402).json({ ok: false, error: "event_payment_pending" }); }
      if (!legacy && entitlement.distribution_method !== method) { await client.query("ROLLBACK"); return res.status(403).json({ ok: false, error: "distribution_method_mismatch" }); }
      if (!legacy && method === "share_link" && entitlement.share_invite_token) {
        const existing = await client.query("SELECT token,expires_at FROM invites WHERE token=$1 AND event_id=$2 LIMIT 1", [entitlement.share_invite_token, String(eventId)]);
        if (existing.rowCount) { await client.query("COMMIT"); return res.json({ ok: true, token: existing.rows[0].token, eventId: String(eventId), expiresAt: existing.rows[0].expires_at, reused: true }); }
      }
      if (!legacy && method === "email" && Number(entitlement.email_consumed) >= Number(entitlement.email_limit)) { await client.query("ROLLBACK"); return res.status(409).json({ ok: false, error: "email_invitation_limit_reached" }); }
      const token = inviteToken();
      const expiresAt = hoursFromNow(Number(expiresHours || 72));
      await client.query(
        `INSERT INTO invites(token,event_id,inviter_email,invited_email,expires_at,delivery_method) VALUES($1,$2,$3,$4,$5,$6)`,
        [token, String(eventId), String(inviterEmail), invitedEmail ? String(invitedEmail) : null, expiresAt, method]
      );
      if (!legacy && method === "email") await client.query("UPDATE event_entitlements SET email_consumed=email_consumed+1,updated_at=now() WHERE event_id=$1", [String(eventId)]);
      if (!legacy && method === "share_link") await client.query("UPDATE event_entitlements SET share_invite_token=$2,updated_at=now() WHERE event_id=$1", [String(eventId), token]);
      await client.query("COMMIT");
      return res.json({ ok: true, token, eventId: String(eventId), expiresAt: expiresAt.toISOString() });
    } catch (error) {
      if (client) await client.query("ROLLBACK").catch(() => {});
      console.error("invite_create_failed", error);
      return res.status(500).json({ ok: false, error: "invite_create_failed" });
    } finally { client?.release(); }
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
    let client;
    try {
      client = await pool.connect();
      const { token, response, responderEmail, responderName, guestsCount, message, responseKey } = req.body || {};
      const value = String(token || "").trim();
      const answer = String(response || "").toLowerCase().trim();
      const name = String(responderName || "").trim().slice(0, 160);
      const guests = Math.max(0, Math.min(50, Math.trunc(Number(guestsCount) || 0)));
      const note = String(message || "").trim().slice(0, 1000) || null;
      if (!value) return res.status(400).json({ ok: false, error: "missing_token" });
      if (!name) return res.status(400).json({ ok: false, error: "missing_responder_name" });
      if (!["yes", "maybe", "no"].includes(answer)) return res.status(400).json({ ok: false, error: "bad_response" });

      await client.query("BEGIN");
      const existing = await client.query("SELECT token,event_id,expires_at FROM invites WHERE token=$1 FOR UPDATE", [value]);
      if (!existing.rowCount) { await client.query("ROLLBACK"); return res.status(404).json({ ok: false, error: "token_not_found" }); }
      if (new Date(existing.rows[0].expires_at).getTime() < Date.now()) {
        await client.query("ROLLBACK");
        return res.status(410).json({ ok: false, error: "token_expired", expiresAt: existing.rows[0].expires_at });
      }

      const eventId = existing.rows[0].event_id;
      const shared = await client.query(`SELECT share_rsvp_limit FROM event_entitlements WHERE event_id=$1 AND status='paid' AND distribution_method='share_link' AND share_invite_token=$2 FOR UPDATE`, [eventId, value]);
      if (shared.rowCount) {
        const suppliedKey = String(responseKey || "").trim().slice(0, 100);
        const email = responderEmail ? String(responderEmail).trim().toLowerCase().slice(0, 320) : null;
        let current = suppliedKey ? await client.query("SELECT id,response_key FROM share_link_rsvps WHERE invite_token=$1 AND response_key=$2 LIMIT 1", [value, suppliedKey]) : { rowCount: 0, rows: [] };
        if (!current.rowCount && email) current = await client.query("SELECT id,response_key FROM share_link_rsvps WHERE invite_token=$1 AND lower(responder_email)=$2 LIMIT 1", [value, email]);
        if (current.rowCount) {
          await client.query(`UPDATE share_link_rsvps SET responder_email=COALESCE($2,responder_email),responder_name=$3,response=$4,guests_count=$5,message=$6,responded_at=now() WHERE id=$1`, [current.rows[0].id, email, name, answer, guests, note]);
          await client.query("COMMIT");
          return res.json({ ok: true, token: value, response: answer, responseKey: current.rows[0].response_key, updated: true });
        }
        const count = await client.query("SELECT count(*)::int AS count FROM share_link_rsvps WHERE event_id=$1", [eventId]);
        if (Number(count.rows[0].count) >= Number(shared.rows[0].share_rsvp_limit)) { await client.query("ROLLBACK"); return res.status(409).json({ ok: false, error: "share_link_rsvp_limit_reached" }); }
        const newKey = crypto.randomBytes(24).toString("base64url");
        await client.query(`INSERT INTO share_link_rsvps(event_id,invite_token,response_key,responder_email,responder_name,response,guests_count,message) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [eventId, value, newKey, email, name, answer, guests, note]);
        await client.query("COMMIT");
        return res.json({ ok: true, token: value, response: answer, responseKey: newKey, created: true });
      }

      await client.query(
        `UPDATE invites SET responded_at=now(), response=$2,
          invited_email=COALESCE(invited_email,$3), responder_name=$4,
          guests_count=$5, message=$6 WHERE token=$1`,
        [value, answer, responderEmail ? String(responderEmail).trim() : null, name, guests, note]
      );
      await client.query("COMMIT");
      return res.json({ ok: true, token: value, response: answer });
    } catch (error) {
      if (client) await client.query("ROLLBACK").catch(() => {});
      console.error("invite_response_failed", error);
      return res.status(500).json({ ok: false, error: "invite_response_failed" });
    } finally { client?.release(); }
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
