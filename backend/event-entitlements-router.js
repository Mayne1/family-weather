"use strict";

const express = require("express");
const crypto = require("crypto");
const { PLANS, planFor, paidPlan } = require("./commerce-plans");

const COMMERCE_EVENTS = new Set(["event_created", "invitation_saved", "share_link_created", "email_invitation_sent", "checkout_started"]);

function safeEqual(left, right) {
  const a = Buffer.from(left || "", "utf8");
  const b = Buffer.from(right || "", "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function validStripeSignature(payload, signature, secret) {
  const parts = String(signature || "").split(",");
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2) || "";
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  const value = Number(timestamp);
  if (!timestamp || !Number.isFinite(value) || Math.abs(Date.now() / 1000 - value) > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return signatures.some((candidate) => safeEqual(candidate, expected));
}

function hashPromotionCode(value) {
  return crypto.createHash("sha256").update(String(value || "").trim().toUpperCase()).digest("hex");
}

function normalize(row, rsvpCount = 0) {
  if (!row) return null;
  const legacy = row.status === "legacy";
  const plan = legacy ? null : planFor(row.product_code);
  const emailLimit = Number(row.email_limit);
  const emailConsumed = Number(row.email_consumed);
  return {
    event_id: String(row.event_id),
    status: row.status,
    product_code: row.product_code,
    plan_name: legacy ? "Existing event access" : plan.name,
    plan_rank: legacy ? 999 : plan.rank,
    presentation: legacy ? "legacy" : plan.presentation,
    amount_cents: Number(row.amount_cents),
    currency: row.currency,
    distribution_method: row.distribution_method,
    email_limit: emailLimit,
    email_consumed: emailConsumed,
    email_remaining: legacy ? null : Math.max(0, emailLimit - emailConsumed),
    share_rsvp_count: Number(rsvpCount),
    share_invite_token: row.share_invite_token || null,
    checkout_url: row.stripe_checkout_url || null,
    checkout_session_id: row.stripe_checkout_session_id || null,
    pending_product_code: row.pending_product_code || null,
    pending_amount_cents: row.pending_amount_cents == null ? null : Number(row.pending_amount_cents),
    purchased_at: row.purchased_at || null,
  };
}

async function ensureFreeEntitlement(client, eventId) {
  await client.query(
    `INSERT INTO event_entitlements
      (event_id,status,product_code,amount_cents,currency,distribution_method,email_limit,share_rsvp_limit)
     VALUES($1,'free','free_event',0,'usd','both',10,2147483647)
     ON CONFLICT(event_id) DO NOTHING`,
    [eventId],
  );
}

function adminUids() {
  return new Set(String(process.env.FAMILY_WEATHER_PROMO_ADMIN_UIDS || "").split(",").map((value) => value.trim()).filter(Boolean));
}

module.exports = function makeEventEntitlementsRouter(pool, requireFirebaseUser) {
  const router = express.Router();

  router.get("/events/:id/entitlement", requireFirebaseUser, async (req, res) => {
    const id = String(req.params.id || "").trim().slice(0, 40);
    try {
      const owner = await pool.query("SELECT id FROM events WHERE id=$1 AND owner_uid=$2 LIMIT 1", [id, req.uid]);
      if (!owner.rowCount) return res.status(404).json({ ok: false, error: "event_not_found_or_not_owner" });
      await ensureFreeEntitlement(pool, id);
      const result = await pool.query("SELECT * FROM event_entitlements WHERE event_id=$1", [id]);
      const count = await pool.query("SELECT count(*)::int AS count FROM share_link_rsvps WHERE event_id=$1", [id]);
      return res.json({ ok: true, entitlement: normalize(result.rows[0], count.rows[0].count) });
    } catch (error) {
      console.error("entitlement_fetch_failed", error);
      return res.status(500).json({ ok: false, error: "entitlement_fetch_failed" });
    }
  });

  router.post("/events/:id/entitlement/checkout", requireFirebaseUser, async (req, res) => {
    const id = String(req.params.id || "").trim().slice(0, 40);
    const target = paidPlan(String(req.body?.product_code || "").trim());
    const sessionId = String(req.body?.stripe_checkout_session_id || "").trim().slice(0, 255);
    const checkoutUrl = String(req.body?.stripe_checkout_url || "").trim().slice(0, 2000);
    let validUrl = false;
    try {
      const parsed = new URL(checkoutUrl);
      validUrl = parsed.protocol === "https:" && parsed.hostname === "checkout.stripe.com";
    } catch {}
    if (!target || !sessionId.startsWith("cs_") || !validUrl) return res.status(400).json({ ok: false, error: "invalid_checkout" });

    let client;
    try {
      client = await pool.connect();
      await client.query("BEGIN");
      const owner = await client.query("SELECT id FROM events WHERE id=$1 AND owner_uid=$2 LIMIT 1", [id, req.uid]);
      if (!owner.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json({ ok: false, error: "event_not_found_or_not_owner" });
      }
      await ensureFreeEntitlement(client, id);
      const currentResult = await client.query("SELECT * FROM event_entitlements WHERE event_id=$1 FOR UPDATE", [id]);
      const current = currentResult.rows[0];
      if (current.status === "legacy" || target.rank <= planFor(current.product_code).rank) {
        await client.query("ROLLBACK");
        return res.status(409).json({ ok: false, error: "event_already_entitled" });
      }
      if (current.pending_product_code && current.stripe_checkout_session_id && current.pending_product_code !== target.code) {
        await client.query("ROLLBACK");
        return res.status(409).json({ ok: false, error: "checkout_already_pending" });
      }
      const amountDue = target.priceCents - Number(current.amount_cents);
      if (amountDue <= 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({ ok: false, error: "invalid_upgrade_amount" });
      }
      const result = await client.query(
        `UPDATE event_entitlements SET stripe_checkout_session_id=$2,stripe_checkout_url=$3,
           pending_product_code=$4,pending_amount_cents=$5,updated_at=now()
         WHERE event_id=$1 RETURNING *`,
        [id, sessionId, checkoutUrl, target.code, amountDue],
      );
      await client.query(
        "INSERT INTO commerce_events(event_id,owner_uid,event_name,detail) VALUES($1,$2,'checkout_started',$3::jsonb)",
        [id, req.uid, JSON.stringify({ from: current.product_code, to: target.code, amount_cents: amountDue })],
      );
      await client.query("COMMIT");
      return res.json({ ok: true, entitlement: normalize(result.rows[0]) });
    } catch (error) {
      if (client) await client.query("ROLLBACK").catch(() => {});
      console.error("entitlement_checkout_save_failed", error);
      return res.status(500).json({ ok: false, error: "entitlement_checkout_save_failed" });
    } finally {
      client?.release();
    }
  });

  router.delete("/events/:id/entitlement/checkout", requireFirebaseUser, async (req, res) => {
    const id = String(req.params.id || "").trim().slice(0, 40);
    const sessionId = String(req.body?.stripe_checkout_session_id || "").trim().slice(0, 255);
    if (!sessionId.startsWith("cs_")) return res.status(400).json({ ok: false, error: "invalid_checkout" });
    try {
      const result = await pool.query(
        `UPDATE event_entitlements e SET stripe_checkout_session_id=NULL,stripe_checkout_url=NULL,
           pending_product_code=NULL,pending_amount_cents=NULL,updated_at=now()
         FROM events v WHERE e.event_id=v.id AND e.event_id=$1 AND v.owner_uid=$2 AND e.stripe_checkout_session_id=$3
         RETURNING e.event_id`,
        [id, req.uid, sessionId],
      );
      return result.rowCount ? res.json({ ok: true }) : res.status(404).json({ ok: false, error: "checkout_not_found" });
    } catch (error) {
      console.error("checkout_cancel_failed", error);
      return res.status(500).json({ ok: false, error: "checkout_cancel_failed" });
    }
  });

  // A rejected provider delivery must not consume the host's allowance. This
  // remains owner-authenticated so an invitation token cannot be used to mint
  // additional delivery capacity.
  router.post("/events/:id/entitlement/release-email", requireFirebaseUser, async (req, res) => {
    const id = String(req.params.id || "").trim().slice(0, 40);
    const token = String(req.body?.token || "").trim().slice(0, 100);
    if (!token) return res.status(400).json({ ok: false, error: "invalid_invite_release" });
    let client;
    try {
      client = await pool.connect();
      await client.query("BEGIN");
      const owner = await client.query("SELECT id FROM events WHERE id=$1 AND owner_uid=$2 LIMIT 1", [id, req.uid]);
      if (!owner.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json({ ok: false, error: "event_not_found_or_not_owner" });
      }
      const removed = await client.query(
        `DELETE FROM invites WHERE token=$1 AND event_id=$2 AND delivery_method='email'
         AND opened_at IS NULL AND responded_at IS NULL RETURNING token`,
        [token, id],
      );
      if (removed.rowCount) await client.query("UPDATE event_entitlements SET email_consumed=GREATEST(0,email_consumed-1),updated_at=now() WHERE event_id=$1 AND status <> 'legacy'", [id]);
      await client.query("COMMIT");
      return res.json({ ok: true, released: Boolean(removed.rowCount) });
    } catch (error) {
      if (client) await client.query("ROLLBACK").catch(() => {});
      console.error("invite_release_failed", error);
      return res.status(500).json({ ok: false, error: "invite_release_failed" });
    } finally {
      client?.release();
    }
  });

  router.post("/events/:id/entitlement/promo", requireFirebaseUser, async (req, res) => {
    const id = String(req.params.id || "").trim().slice(0, 40);
    const codeHash = hashPromotionCode(req.body?.code);
    let client;
    try {
      client = await pool.connect();
      await client.query("BEGIN");
      const owner = await client.query("SELECT id FROM events WHERE id=$1 AND owner_uid=$2 LIMIT 1", [id, req.uid]);
      if (!owner.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json({ ok: false, error: "event_not_found_or_not_owner" });
      }
      await ensureFreeEntitlement(client, id);
      const codeResult = await client.query("SELECT * FROM promotion_codes WHERE code_hash=$1 FOR UPDATE", [codeHash]);
      if (!codeResult.rowCount || codeResult.rows[0].redeemed_at || codeResult.rows[0].disabled_at) {
        await client.query("ROLLBACK");
        return res.status(400).json({ ok: false, error: "promotion_code_invalid" });
      }
      const target = paidPlan(codeResult.rows[0].product_code);
      const currentResult = await client.query("SELECT * FROM event_entitlements WHERE event_id=$1 FOR UPDATE", [id]);
      const current = currentResult.rows[0];
      if (!target || current.status === "legacy" || target.rank <= planFor(current.product_code).rank) {
        await client.query("ROLLBACK");
        return res.status(409).json({ ok: false, error: "promotion_would_not_upgrade_event" });
      }
      const result = await client.query(
        `UPDATE event_entitlements SET status='paid',product_code=$2,amount_cents=$3,
           distribution_method='both',email_limit=$4,promotion_code_hash=$5,purchased_at=COALESCE(purchased_at,now()),
           stripe_checkout_session_id=NULL,stripe_checkout_url=NULL,pending_product_code=NULL,pending_amount_cents=NULL,updated_at=now()
         WHERE event_id=$1 RETURNING *`,
        [id, target.code, target.priceCents, target.emailLimit, codeHash],
      );
      await client.query("UPDATE promotion_codes SET redeemed_event_id=$2,redeemed_by_uid=$3,redeemed_at=now() WHERE code_hash=$1", [codeHash, id, req.uid]);
      await client.query("INSERT INTO commerce_events(event_id,owner_uid,event_name,detail) VALUES($1,$2,'promotion_redeemed',$3::jsonb)", [id, req.uid, JSON.stringify({ product_code: target.code })]);
      await client.query("COMMIT");
      return res.json({ ok: true, entitlement: normalize(result.rows[0]) });
    } catch (error) {
      if (client) await client.query("ROLLBACK").catch(() => {});
      console.error("promotion_redeem_failed", error);
      return res.status(500).json({ ok: false, error: "promotion_redeem_failed" });
    } finally {
      client?.release();
    }
  });

  router.get("/billing/promo-codes", requireFirebaseUser, async (req, res) => {
    if (!adminUids().has(req.uid)) return res.status(403).json({ ok: false, error: "promotion_admin_required" });
    try {
      const result = await pool.query("SELECT code_label,product_code,redeemed_event_id,redeemed_at,disabled_at,created_at FROM promotion_codes ORDER BY created_at DESC LIMIT 500");
      return res.json({ ok: true, codes: result.rows });
    } catch (error) {
      console.error("promotion_list_failed", error);
      return res.status(500).json({ ok: false, error: "promotion_list_failed" });
    }
  });

  router.post("/billing/promo-codes", requireFirebaseUser, async (req, res) => {
    if (!adminUids().has(req.uid)) return res.status(403).json({ ok: false, error: "promotion_admin_required" });
    if (req.body?.action === "disable") {
      const code = String(req.body?.code || "").trim().toUpperCase();
      if (!/^FW-[A-F0-9]{12}$/.test(code)) return res.status(400).json({ ok: false, error: "invalid_promotion_code" });
      try {
        const result = await pool.query("UPDATE promotion_codes SET disabled_at=now() WHERE code_hash=$1 AND redeemed_at IS NULL AND disabled_at IS NULL RETURNING code_label", [hashPromotionCode(code)]);
        return result.rowCount ? res.json({ ok: true, disabled: result.rows[0].code_label }) : res.status(409).json({ ok: false, error: "promotion_not_available" });
      } catch (error) {
        console.error("promotion_disable_failed", error);
        return res.status(500).json({ ok: false, error: "promotion_disable_failed" });
      }
    }
    const target = paidPlan(String(req.body?.product_code || "").trim());
    const count = Math.trunc(Number(req.body?.count));
    if (!target || !Number.isFinite(count) || count < 1 || count > 100) return res.status(400).json({ ok: false, error: "invalid_promotion_batch" });
    const codes = Array.from({ length: count }, () => `FW-${crypto.randomBytes(6).toString("hex").toUpperCase()}`);
    let client;
    try {
      client = await pool.connect();
      await client.query("BEGIN");
      for (const code of codes) await client.query("INSERT INTO promotion_codes(code_hash,code_label,product_code,created_by_uid) VALUES($1,$2,$3,$4)", [hashPromotionCode(code), `FW-…${code.slice(-6)}`, target.code, req.uid]);
      await client.query("COMMIT");
      return res.json({ ok: true, product_code: target.code, codes });
    } catch (error) {
      if (client) await client.query("ROLLBACK").catch(() => {});
      console.error("promotion_generate_failed", error);
      return res.status(500).json({ ok: false, error: "promotion_generate_failed" });
    } finally {
      client?.release();
    }
  });

  router.post("/events/:id/commerce-event", requireFirebaseUser, async (req, res) => {
    const id = String(req.params.id || "").trim().slice(0, 40);
    const eventName = String(req.body?.event_name || "").trim();
    if (!COMMERCE_EVENTS.has(eventName)) return res.status(400).json({ ok: false, error: "invalid_commerce_event" });
    try {
      const owner = await pool.query("SELECT id FROM events WHERE id=$1 AND owner_uid=$2 LIMIT 1", [id, req.uid]);
      if (!owner.rowCount) return res.status(404).json({ ok: false, error: "event_not_found_or_not_owner" });
      const detail = req.body?.detail && typeof req.body.detail === "object" && !Array.isArray(req.body.detail) ? req.body.detail : {};
      await pool.query("INSERT INTO commerce_events(event_id,owner_uid,event_name,detail) VALUES($1,$2,$3,$4::jsonb)", [id, req.uid, eventName, JSON.stringify(detail).slice(0, 4000)]);
      return res.json({ ok: true });
    } catch (error) {
      console.error("commerce_event_save_failed", error);
      return res.status(500).json({ ok: false, error: "commerce_event_save_failed" });
    }
  });

  router.post("/billing/stripe-webhook", async (req, res) => {
    const payload = typeof req.body?.payload === "string" ? req.body.payload : "";
    const signature = typeof req.body?.signature === "string" ? req.body.signature : "";
    const secret = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
    if (!secret) return res.status(503).json({ ok: false, error: "stripe_webhook_not_configured" });
    if (!payload || payload.length > 2_000_000 || !validStripeSignature(payload, signature, secret)) return res.status(400).json({ ok: false, error: "invalid_stripe_signature" });
    let stripeEvent;
    try { stripeEvent = JSON.parse(payload); } catch { return res.status(400).json({ ok: false, error: "invalid_stripe_payload" }); }
    if (stripeEvent?.type !== "checkout.session.completed") return res.json({ ok: true, ignored: true });

    const session = stripeEvent?.data?.object || {};
    const eventId = String(session?.metadata?.event_id || "").trim().slice(0, 40);
    const target = paidPlan(String(session?.metadata?.product_code || "").trim());
    const sessionId = String(session?.id || "").trim().slice(0, 255);
    if (!(eventId && target && sessionId.startsWith("cs_") && session?.mode === "payment" && session?.payment_status === "paid" && String(session?.currency || "").toLowerCase() === "usd")) return res.status(400).json({ ok: false, error: "invalid_purchase_confirmation" });

    let client;
    try {
      client = await pool.connect();
      await client.query("BEGIN");
      const currentResult = await client.query("SELECT * FROM event_entitlements WHERE event_id=$1 AND stripe_checkout_session_id=$2 FOR UPDATE", [eventId, sessionId]);
      if (!currentResult.rowCount) {
        await client.query("ROLLBACK");
        return res.status(409).json({ ok: false, error: "checkout_not_registered" });
      }
      const current = currentResult.rows[0];
      if (current.status === "paid" && planFor(current.product_code).code === target.code && current.stripe_payment_intent_id === (session.payment_intent || null)) {
        await client.query("COMMIT");
        return res.json({ ok: true, event_id: eventId, duplicate: true });
      }
      if (current.pending_product_code !== target.code || Number(current.pending_amount_cents) !== Number(session.amount_total)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ ok: false, error: "invalid_purchase_amount" });
      }
      await client.query(
        `UPDATE event_entitlements SET status='paid',product_code=$3,amount_cents=$4,distribution_method='both',email_limit=$5,
           purchased_at=COALESCE(purchased_at,now()),stripe_payment_intent_id=$6,stripe_customer_id=$7,
           stripe_checkout_url=NULL,pending_product_code=NULL,pending_amount_cents=NULL,updated_at=now()
         WHERE event_id=$1 AND stripe_checkout_session_id=$2`,
        [eventId, sessionId, target.code, target.priceCents, target.emailLimit, session.payment_intent || null, session.customer || null],
      );
      await client.query("INSERT INTO commerce_events(event_id,event_name,detail) VALUES($1,'purchase_completed',$2::jsonb)", [eventId, JSON.stringify({ product_code: target.code, amount_cents: Number(session.amount_total) })]);
      await client.query("COMMIT");
      return res.json({ ok: true, event_id: eventId });
    } catch (error) {
      if (client) await client.query("ROLLBACK").catch(() => {});
      console.error("stripe_entitlement_confirmation_failed", error);
      return res.status(500).json({ ok: false, error: "entitlement_confirmation_failed" });
    } finally {
      client?.release();
    }
  });

  return router;
};

module.exports._test = { validStripeSignature, hashPromotionCode, normalize, PLANS };
