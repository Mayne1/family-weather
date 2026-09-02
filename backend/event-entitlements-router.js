"use strict";
const express = require("express");
const crypto = require("crypto");
const PRODUCT_CODE = "family_weather_launch_event_599";
const METHODS = new Set(["email", "share_link"]);

function safeEqual(left, right) { const a = Buffer.from(left || "", "utf8"); const b = Buffer.from(right || "", "utf8"); return a.length === b.length && crypto.timingSafeEqual(a, b); }
function validStripeSignature(payload, signature, secret) {
  const parts = String(signature || "").split(",");
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2) || "";
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  const value = Number(timestamp);
  if (!timestamp || !Number.isFinite(value) || Math.abs(Date.now() / 1000 - value) > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return signatures.some((candidate) => safeEqual(candidate, expected));
}
function normalize(row, rsvpCount = 0) {
  if (!row) return null;
  return { event_id: String(row.event_id), status: row.status, product_code: row.product_code, amount_cents: Number(row.amount_cents), currency: row.currency, distribution_method: row.distribution_method, email_limit: Number(row.email_limit), email_consumed: Number(row.email_consumed), email_remaining: Math.max(0, Number(row.email_limit) - Number(row.email_consumed)), share_rsvp_limit: Number(row.share_rsvp_limit), share_rsvp_count: Number(rsvpCount), share_rsvp_remaining: Math.max(0, Number(row.share_rsvp_limit) - Number(rsvpCount)), share_invite_token: row.share_invite_token || null, checkout_url: row.stripe_checkout_url || null, purchased_at: row.purchased_at || null };
}

module.exports = function makeEventEntitlementsRouter(pool, requireFirebaseUser) {
  const router = express.Router();
  router.get("/events/:id/entitlement", requireFirebaseUser, async (req, res) => {
    const id = String(req.params.id || "").trim().slice(0, 40);
    try {
      const owner = await pool.query("SELECT id FROM events WHERE id=$1 AND owner_uid=$2 LIMIT 1", [id, req.uid]);
      if (!owner.rowCount) return res.status(404).json({ ok: false, error: "event_not_found_or_not_owner" });
      const result = await pool.query("SELECT * FROM event_entitlements WHERE event_id=$1", [id]);
      const count = result.rowCount ? await pool.query("SELECT count(*)::int AS count FROM share_link_rsvps WHERE event_id=$1", [id]) : { rows: [{ count: 0 }] };
      return res.json({ ok: true, entitlement: normalize(result.rows[0], count.rows[0].count) });
    } catch (error) { console.error("entitlement_fetch_failed", error); return res.status(500).json({ ok: false, error: "entitlement_fetch_failed" }); }
  });
  router.post("/events/:id/entitlement/checkout", requireFirebaseUser, async (req, res) => {
    const id = String(req.params.id || "").trim().slice(0, 40);
    const method = String(req.body?.distribution_method || "").trim(); const sessionId = String(req.body?.stripe_checkout_session_id || "").trim().slice(0, 255); const checkoutUrl = String(req.body?.stripe_checkout_url || "").trim().slice(0, 2000);
    let validUrl = false; try { const parsed = new URL(checkoutUrl); validUrl = parsed.protocol === "https:" && parsed.hostname === "checkout.stripe.com"; } catch {}
    if (!METHODS.has(method) || !sessionId.startsWith("cs_") || !validUrl) return res.status(400).json({ ok: false, error: "invalid_checkout" });
    try {
      const owner = await pool.query("SELECT id FROM events WHERE id=$1 AND owner_uid=$2 LIMIT 1", [id, req.uid]); if (!owner.rowCount) return res.status(404).json({ ok: false, error: "event_not_found_or_not_owner" });
      const result = await pool.query(`INSERT INTO event_entitlements (event_id,status,product_code,amount_cents,currency,distribution_method,stripe_checkout_session_id,stripe_checkout_url) VALUES($1,'pending',$2,599,'usd',$3,$4,$5) ON CONFLICT(event_id) DO UPDATE SET status='pending',product_code=EXCLUDED.product_code,amount_cents=EXCLUDED.amount_cents,currency=EXCLUDED.currency,distribution_method=EXCLUDED.distribution_method,stripe_checkout_session_id=EXCLUDED.stripe_checkout_session_id,stripe_checkout_url=EXCLUDED.stripe_checkout_url,updated_at=now() WHERE event_entitlements.status='pending' RETURNING *`, [id, PRODUCT_CODE, method, sessionId, checkoutUrl]);
      if (!result.rowCount) return res.status(409).json({ ok: false, error: "event_already_entitled" });
      return res.json({ ok: true, entitlement: normalize(result.rows[0]) });
    } catch (error) { console.error("entitlement_checkout_save_failed", error); return res.status(500).json({ ok: false, error: "entitlement_checkout_save_failed" }); }
  });
  router.post("/billing/stripe-webhook", async (req, res) => {
    const payload = typeof req.body?.payload === "string" ? req.body.payload : ""; const signature = typeof req.body?.signature === "string" ? req.body.signature : ""; const secret = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
    if (!secret) return res.status(503).json({ ok: false, error: "stripe_webhook_not_configured" });
    if (!payload || payload.length > 2_000_000 || !validStripeSignature(payload, signature, secret)) return res.status(400).json({ ok: false, error: "invalid_stripe_signature" });
    let event; try { event = JSON.parse(payload); } catch { return res.status(400).json({ ok: false, error: "invalid_stripe_payload" }); }
    if (event?.type !== "checkout.session.completed") return res.json({ ok: true, ignored: true });
    const session = event?.data?.object || {}; const eventId = String(session?.metadata?.event_id || "").trim().slice(0, 40); const method = String(session?.metadata?.distribution_method || "").trim(); const product = String(session?.metadata?.product_code || "").trim(); const sessionId = String(session?.id || "").trim().slice(0, 255);
    if (!(eventId && METHODS.has(method) && product === PRODUCT_CODE && sessionId.startsWith("cs_") && session?.mode === "payment" && session?.payment_status === "paid" && Number(session?.amount_total) === 599 && String(session?.currency || "").toLowerCase() === "usd")) return res.status(400).json({ ok: false, error: "invalid_purchase_confirmation" });
    try {
      const result = await pool.query(`UPDATE event_entitlements SET status='paid',purchased_at=COALESCE(purchased_at,now()),stripe_payment_intent_id=$3,stripe_customer_id=$4,updated_at=now() WHERE event_id=$1 AND stripe_checkout_session_id=$2 AND distribution_method=$5 AND product_code=$6 AND amount_cents=599 AND currency='usd' RETURNING event_id`, [eventId, sessionId, session.payment_intent || null, session.customer || null, method, PRODUCT_CODE]);
      if (!result.rowCount) return res.status(409).json({ ok: false, error: "checkout_not_registered" }); return res.json({ ok: true, event_id: eventId });
    } catch (error) { console.error("stripe_entitlement_confirmation_failed", error); return res.status(500).json({ ok: false, error: "entitlement_confirmation_failed" }); }
  });
  return router;
};
