import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readPurchaseReceipt, validPurchaseIdentifiers, validatePurchaseReceipt } from "./purchaseReceipt.ts";

const eventId = "123";
const sessionId = "cs_live_ReceiptTest123";
const nowSeconds = 1_800_000_000;
const entitlement = () => ({
  event_id: eventId, status: "paid", product_code: "clean_event_199", amount_cents: 199, currency: "usd",
  checkout_session_id: sessionId, checkout_url: null, pending_product_code: null, pending_amount_cents: null,
});
const session = () => ({
  id: sessionId, mode: "payment", status: "complete", payment_status: "paid", livemode: true,
  currency: "usd", client_reference_id: eventId, amount_total: 199, created: nowSeconds - 60,
  metadata: { event_id: eventId, product_code: "clean_event_199", purchase_amount_cents: "199" },
});
const request = () => ({ eventId, sessionId, authorization: "Bearer test.jwt.token" });
const owner = () => ({ ok: true, status: 200, data: { ok: true, entitlement: entitlement() } });

test("verified live purchase exposes only a stable opaque 64-character transaction ID", () => {
  const result = validatePurchaseReceipt(eventId, sessionId, entitlement(), session(), nowSeconds);
  assert.equal(result.status, 200);
  assert.deepEqual(Object.keys(result.body).sort(), ["ok", "receipt"]);
  assert.deepEqual(Object.keys(result.body.receipt!), ["transaction_id"]);
  assert.match(result.body.receipt!.transaction_id, /^[0-9a-f]{64}$/);
  assert.deepEqual(validatePurchaseReceipt(eventId, sessionId, entitlement(), session(), nowSeconds), result);
  const anotherId = "cs_live_ReceiptTest456";
  const another = validatePurchaseReceipt(eventId, anotherId, { ...entitlement(), checkout_session_id: anotherId }, { ...session(), id: anotherId }, nowSeconds);
  assert.notEqual(another.body.receipt!.transaction_id, result.body.receipt!.transaction_id);
  const serialized = JSON.stringify(result.body);
  for (const privateValue of [sessionId, "event_id", "email", "amount_total", "returnPath", "currency"]) assert.equal(serialized.includes(privateValue), false);
});

test("invalid identifiers and malformed authorization never reach either source", async () => {
  let calls = 0;
  const sources = {
    loadEntitlement: async () => { calls++; return owner(); },
    loadStripeSession: async () => { calls++; return { ok: true, status: 200, data: session() }; },
  };
  for (const authorization of ["", "Bearer ", "Basic token", "Bearer secret with spaces", "Bearer " + "x".repeat(8193)]) {
    assert.equal((await readPurchaseReceipt({ ...request(), authorization }, sources)).status, 401);
  }
  for (const invalid of ["", "../123", "123?email=x", "1/2", "-1", "0", "12345678901234567890"]) {
    assert.equal(validPurchaseIdentifiers(invalid, sessionId), false);
    assert.equal((await readPurchaseReceipt({ ...request(), eventId: invalid }, sources)).status, 400);
  }
  for (const invalid of ["", "not-a-session", "cs_live_", "cs_live_a?token=x", "cs_live_a/b", "cs_live_" + "x".repeat(221)]) {
    assert.equal(validPurchaseIdentifiers(eventId, invalid), false);
    assert.equal((await readPurchaseReceipt({ ...request(), sessionId: invalid }, sources)).status, 400);
  }
  assert.equal(calls, 0);
});

test("owner authorization and stored session matching must pass before Stripe is read", async () => {
  let stripeCalls = 0;
  const stripe = async () => { stripeCalls++; return { ok: true, status: 200, data: session() }; };
  for (const status of [401, 403, 404, 500]) {
    const result = await readPurchaseReceipt(request(), {
      loadEntitlement: async () => ({ ok: false, status, data: { error: "private upstream detail" } }),
      loadStripeSession: stripe,
    });
    assert.equal(result.status, status === 500 ? 502 : status);
    assert.equal(JSON.stringify(result).includes("private upstream detail"), false);
  }
  for (const changes of [{ event_id: "456" }, { checkout_session_id: "cs_live_AnotherEvent" }, { checkout_session_id: null }, { product_code: "family_access" }, { status: "free" }]) {
    const result = await readPurchaseReceipt(request(), {
      loadEntitlement: async () => ({ ...owner(), data: { ok: true, entitlement: { ...entitlement(), ...changes } } }),
      loadStripeSession: stripe,
    });
    assert.equal(result.status, 404);
  }
  assert.equal(stripeCalls, 0);
  const sequence: string[] = [];
  const result = await readPurchaseReceipt(request(), {
    loadEntitlement: async (id, authorization) => { assert.equal(id, eventId); assert.equal(authorization, request().authorization); sequence.push("owner"); return owner(); },
    loadStripeSession: async (id) => { assert.equal(id, sessionId); assert.deepEqual(sequence, ["owner"]); sequence.push("stripe"); return { ok: true, status: 200, data: session() }; },
    nowSeconds,
  });
  assert.equal(result.status, 200);
  assert.deepEqual(sequence, ["owner", "stripe"]);
});

test("a webhook-pending purchase waits without contacting Stripe or producing a conversion", async () => {
  const pending = { ...entitlement(), status: "free", product_code: "free_event", amount_cents: 0,
    pending_product_code: "clean_event_199", pending_amount_cents: 199, checkout_url: "https://checkout.stripe.com/example" };
  assert.equal(validatePurchaseReceipt(eventId, sessionId, pending, session(), nowSeconds).status, 202);
  let stripeCalls = 0;
  const result = await readPurchaseReceipt(request(), {
    loadEntitlement: async () => ({ ...owner(), data: { ok: true, entitlement: pending } }),
    loadStripeSession: async () => { stripeCalls++; return { ok: true, status: 200, data: session() }; },
  });
  assert.equal(result.status, 202);
  assert.equal(result.body.receipt, undefined);
  assert.equal(stripeCalls, 0);
  assert.equal(validatePurchaseReceipt(eventId, sessionId, { ...pending, pending_amount_cents: 1 }, session(), nowSeconds).status, 404);
});

test("free, promotional, family, legacy and unfinished entitlement states cannot be purchases", () => {
  for (const changes of [
    { status: "free", product_code: "free_event", amount_cents: 0, checkout_session_id: null },
    { status: "paid", purchased_at: "2026-01-01", promotion_code_hash: "promotion", checkout_session_id: null },
    { product_code: "family_access", amount_cents: 0 }, { status: "legacy" },
    { amount_cents: 0 }, { amount_cents: "199" }, { currency: "eur" },
    { checkout_url: "https://checkout.stripe.com/still-open" }, { pending_amount_cents: 199 },
  ]) assert.equal(validatePurchaseReceipt(eventId, sessionId, { ...entitlement(), ...changes }, session(), nowSeconds).status, 404, JSON.stringify(changes));
});

test("Stripe payment, live mode, metadata, currency and charge must all agree", () => {
  for (const changes of [
    { id: "cs_live_OtherSession" }, { mode: "subscription" }, { status: "open" }, { status: "expired" },
    { payment_status: "unpaid" }, { payment_status: "no_payment_required" }, { livemode: false }, { livemode: "true" },
    { currency: "eur" }, { client_reference_id: "456" }, { client_reference_id: null },
    { amount_total: 0 }, { amount_total: 198 }, { amount_total: 200 }, { amount_total: "199" }, { amount_total: 199.5 },
    { metadata: null }, { metadata: { ...session().metadata, event_id: "456" } },
    { metadata: { ...session().metadata, product_code: "free_event" } },
    { metadata: { ...session().metadata, product_code: "event_plus_599" } },
    { metadata: { ...session().metadata, product_code: "unknown" } },
  ]) assert.equal(validatePurchaseReceipt(eventId, sessionId, entitlement(), { ...session(), ...changes }, nowSeconds).status, 404, JSON.stringify(changes));
  const testSessionId = "cs_test_ReceiptTest123";
  assert.equal(validatePurchaseReceipt(eventId, testSessionId, { ...entitlement(), checkout_session_id: testSessionId }, { ...session(), id: testSessionId }, nowSeconds).status, 404);
});

test("freshness rejects future and old sessions while accepting the 24-hour boundary", () => {
  for (const created of [nowSeconds + 1, nowSeconds - 86_401, 0, -1, NaN, undefined, String(nowSeconds), nowSeconds - 0.5]) {
    assert.equal(validatePurchaseReceipt(eventId, sessionId, entitlement(), { ...session(), created }, nowSeconds).status, 404);
  }
  for (const created of [nowSeconds, nowSeconds - 86_400]) {
    assert.equal(validatePurchaseReceipt(eventId, sessionId, entitlement(), { ...session(), created }, nowSeconds).status, 200);
  }
});

test("completed upgrades require their exact charge rather than cumulative plan value", () => {
  const upgraded = { ...entitlement(), product_code: "event_plus_599", amount_cents: 599 };
  const upgrade = { ...session(), amount_total: 400, metadata: { ...session().metadata, product_code: "event_plus_599", purchase_amount_cents: "400" } };
  assert.equal(validatePurchaseReceipt(eventId, sessionId, upgraded, upgrade, nowSeconds).status, 200);
  assert.equal(validatePurchaseReceipt(eventId, sessionId, upgraded, { ...upgrade, amount_total: 599 }, nowSeconds).status, 404);
  assert.equal(validatePurchaseReceipt(eventId, sessionId, upgraded, { ...upgrade, metadata: { ...upgrade.metadata, purchase_amount_cents: "599" } }, nowSeconds).status, 404);
  for (const amount of ["0", "-1", "4.00", "0400", "NaN", "", "600", 400, null]) {
    assert.equal(validatePurchaseReceipt(eventId, sessionId, upgraded, { ...upgrade, metadata: { ...upgrade.metadata, purchase_amount_cents: amount } }, nowSeconds).status, 404);
  }
});

test("only unambiguous legacy base purchases work without charge metadata", () => {
  const oldBase = { ...session(), metadata: { event_id: eventId, product_code: "clean_event_199" } };
  assert.equal(validatePurchaseReceipt(eventId, sessionId, entitlement(), oldBase, nowSeconds).status, 200);
  assert.equal(validatePurchaseReceipt(eventId, sessionId, entitlement(), { ...oldBase, amount_total: 1 }, nowSeconds).status, 404);
  const oldUpgrade = { ...session(), amount_total: 400, metadata: { event_id: eventId, product_code: "event_plus_599" } };
  assert.equal(validatePurchaseReceipt(eventId, sessionId, { ...entitlement(), product_code: "event_plus_599", amount_cents: 599 }, oldUpgrade, nowSeconds).status, 404);
});

test("upstream failures and timeouts fail closed without disclosing private errors", async () => {
  for (const source of ["owner", "stripe"]) {
    const result = await readPurchaseReceipt(request(), {
      loadEntitlement: async () => { if (source === "owner") throw new Error("private owner token"); return owner(); },
      loadStripeSession: async () => { throw new Error("private Stripe customer email"); },
    });
    assert.equal(result.status, 502);
    assert.deepEqual(result.body, { ok: false, error: "purchase_verification_unavailable" });
  }
  for (const status of [400, 401, 404, 429, 500, 503]) {
    const result = await readPurchaseReceipt(request(), {
      loadEntitlement: async () => owner(),
      loadStripeSession: async () => ({ ok: false, status, data: { private: "provider response" } }),
    });
    assert.equal(result.status, status === 404 ? 404 : status === 503 ? 503 : 502);
    assert.equal(result.body.receipt, undefined);
  }
});

test("checkout and endpoint preserve the private callback and read-only server contract", () => {
  const checkout = readFileSync(new URL("../api/events/[id]/checkout/route.ts", import.meta.url), "utf8");
  assert.ok(checkout.includes("?payment=processing&session_id={CHECKOUT_SESSION_ID}"));
  assert.ok(checkout.includes('form.set("metadata[purchase_amount_cents]", String(amountDue))'));
  const route = readFileSync(new URL("../api/events/[id]/purchase-receipt/route.ts", import.meta.url), "utf8");
  assert.ok(route.includes('"Cache-Control": "no-store, max-age=0"'));
  assert.ok(route.includes('"Vary": "Authorization"'));
  assert.ok(route.includes('enforceRateLimit(request, "purchase-receipt", 20, 60_000)'));
  assert.equal((route.match(/AbortSignal.timeout\(6_000\)/g) || []).length, 2);
  assert.ok(route.includes('query.getAll("session_id").length !== 1'));
  assert.ok(route.includes("process.env.STRIPE_SECRET_KEY"));
  assert.doesNotMatch(route, /method:\s*["'](?:POST|PUT|DELETE|PATCH)["']|console\.|gtag|NEXT_PUBLIC_STRIPE/);
});
