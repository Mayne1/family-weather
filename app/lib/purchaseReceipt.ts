// Server-side only: never import this module from a client component.
import { createHash } from "node:crypto";
import { COMMERCE_PLANS } from "./commercePlans.ts";

export type PurchaseReceipt = { transaction_id: string };
export type PurchaseReceiptResult = {
  status: number;
  body: { ok: boolean; receipt?: PurchaseReceipt; error?: string };
};
type RecordValue = Record<string, unknown>;
type SourceResult = { ok: boolean; status: number; data: unknown };
type PurchaseRequest = { eventId: string; sessionId: string; authorization: string };
type ReceiptSources = {
  loadEntitlement: (eventId: string, authorization: string) => Promise<SourceResult>;
  loadStripeSession: (sessionId: string) => Promise<SourceResult>;
  nowSeconds?: number;
};

const eventIdPattern = /^[1-9][0-9]{0,18}$/;
const sessionIdPattern = /^cs_(?:live|test)_[A-Za-z0-9]{1,220}$/;
const receiptLifetimeSeconds = 24 * 60 * 60;

function record(value: unknown): RecordValue | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : null;
}

function paidPlan(code: unknown) {
  const canonical = code === "family_weather_launch_event_599" ? "event_plus_599" : code;
  return COMMERCE_PLANS.find((plan) => plan.priceCents > 0 && plan.code === canonical);
}

function failure(status: number, error: string): PurchaseReceiptResult {
  return { status, body: { ok: false, error } };
}

export function validPurchaseIdentifiers(eventId: string, sessionId: string): boolean {
  return eventIdPattern.test(eventId) && sessionIdPattern.test(sessionId);
}

function entitlementState(eventId: string, sessionId: string, entitlement: unknown): "invalid" | "pending" | "complete" {
  const row = record(entitlement);
  if (!validPurchaseIdentifiers(eventId, sessionId) || !row || row.event_id !== eventId || row.checkout_session_id !== sessionId) return "invalid";
  if (row.currency !== "usd" || !["free", "paid"].includes(String(row.status))) return "invalid";
  if (row.pending_product_code != null) {
    const target = paidPlan(row.pending_product_code);
    if (!target || !Number.isSafeInteger(row.pending_amount_cents) || Number(row.pending_amount_cents) <= 0 ||
        !Number.isSafeInteger(row.amount_cents) || Number(row.amount_cents) < 0 ||
        row.pending_amount_cents !== target.priceCents - Number(row.amount_cents)) return "invalid";
    return "pending";
  }
  const target = paidPlan(row.product_code);
  // Promotions also set status=paid, but clear the stored Checkout session.
  // A matching session plus this completed row comes from the signed webhook.
  if (!target || row.status !== "paid" || row.amount_cents !== target.priceCents ||
      row.pending_amount_cents != null || row.checkout_url != null) return "invalid";
  return "complete";
}

/** Validate provider data only after authenticating the event owner. No network calls. */
export function validatePurchaseReceipt(
  eventId: string,
  sessionId: string,
  entitlement: unknown,
  stripeSession: unknown,
  nowSeconds = Math.floor(Date.now() / 1000),
): PurchaseReceiptResult {
  const state = entitlementState(eventId, sessionId, entitlement);
  if (state === "invalid") return failure(404, "purchase_not_found");
  if (state === "pending") return failure(202, "purchase_processing");
  const row = record(entitlement)!;
  const session = record(stripeSession);
  const metadata = record(session?.metadata);
  const target = paidPlan(metadata?.product_code);
  if (!session || !metadata || !target || session.id !== sessionId || !sessionId.startsWith("cs_live_") ||
      session.mode !== "payment" || session.status !== "complete" || session.payment_status !== "paid" ||
      session.livemode !== true || session.currency !== "usd" ||
      metadata.event_id !== eventId || session.client_reference_id !== eventId ||
      target.code !== paidPlan(row.product_code)?.code || !Number.isSafeInteger(session.created) ||
      !Number.isFinite(nowSeconds) || Number(session.created) <= 0 || Number(session.created) > nowSeconds ||
      nowSeconds - Number(session.created) > receiptLifetimeSeconds) return failure(404, "purchase_not_found");

  // New sessions preserve their exact original charge in server-set metadata.
  // A legacy Clean Event purchase is unambiguous ($1.99 from the free tier).
  // Other old completed upgrades cannot recover their original delta here, so
  // fail closed rather than comparing the charge with the total plan value.
  let expectedAmount: number | null = null;
  if (Object.prototype.hasOwnProperty.call(metadata, "purchase_amount_cents")) {
    if (typeof metadata.purchase_amount_cents !== "string" || !/^[1-9][0-9]{0,8}$/.test(metadata.purchase_amount_cents)) return failure(404, "purchase_not_found");
    expectedAmount = Number(metadata.purchase_amount_cents);
  } else if (target.code === "clean_event_199") {
    expectedAmount = target.priceCents;
  }
  if (expectedAmount === null || expectedAmount > target.priceCents || !Number.isSafeInteger(session.amount_total) ||
      session.amount_total !== expectedAmount) return failure(404, "purchase_not_found");

  return {
    status: 200,
    body: {
      ok: true,
      receipt: { transaction_id: createHash("sha256").update("family-weather-google-ads-purchase:v1:").update(sessionId).digest("hex") },
    },
  };
}

/** Dependency-injected read flow keeps ownership checks testable without Stripe calls. */
export async function readPurchaseReceipt(request: PurchaseRequest, sources: ReceiptSources): Promise<PurchaseReceiptResult> {
  if (!/^Bearer [A-Za-z0-9._-]{1,8192}$/.test(request.authorization)) return failure(401, "sign_in_required");
  if (!validPurchaseIdentifiers(request.eventId, request.sessionId)) return failure(400, "invalid_purchase_request");
  try {
    // This existing endpoint verifies the Firebase token AND events.owner_uid.
    // Do not contact Stripe until that check and the stored session match pass.
    const owner = await sources.loadEntitlement(request.eventId, request.authorization);
    const data = record(owner.data);
    if (!owner.ok || data?.ok !== true) {
      if ([401, 403, 404].includes(owner.status)) return failure(owner.status, "purchase_not_found");
      return failure(502, "purchase_verification_unavailable");
    }
    const state = entitlementState(request.eventId, request.sessionId, data.entitlement);
    if (state === "invalid") return failure(404, "purchase_not_found");
    if (state === "pending") return failure(202, "purchase_processing");
    const provider = await sources.loadStripeSession(request.sessionId);
    if (!provider.ok) return failure(provider.status === 404 ? 404 : provider.status === 503 ? 503 : 502, "purchase_verification_unavailable");
    return validatePurchaseReceipt(request.eventId, request.sessionId, data.entitlement, provider.data, sources.nowSeconds);
  } catch {
    // Never log authentication headers, provider responses, or private objects.
    return failure(502, "purchase_verification_unavailable");
  }
}
