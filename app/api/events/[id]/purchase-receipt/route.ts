import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "../../../../lib/serverConfig";
import { enforceRateLimit } from "../../../../lib/requestSecurity";
import { readPurchaseReceipt } from "../../../../lib/purchaseReceipt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "no-store, max-age=0",
  "Pragma": "no-cache",
  "Vary": "Authorization",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const limited = enforceRateLimit(request, "purchase-receipt", 20, 60_000);
  if (limited) return limited;
  const { id } = await context.params;
  const query = request.nextUrl.searchParams;
  if (query.size !== 1 || query.getAll("session_id").length !== 1) {
    return NextResponse.json({ ok: false, error: "invalid_purchase_request" }, { status: 400, headers });
  }
  const result = await readPurchaseReceipt({
    eventId: id,
    sessionId: query.get("session_id") || "",
    authorization: request.headers.get("authorization") || "",
  }, {
    async loadEntitlement(eventId, authorization) {
      const response = await fetch(backendUrl(`/events/${encodeURIComponent(eventId)}/entitlement`), {
        headers: { Authorization: authorization }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(6_000),
      });
      return { ok: response.ok, status: response.status, data: await response.json() };
    },
    async loadStripeSession(sessionId) {
      const secret = process.env.STRIPE_SECRET_KEY?.trim();
      if (!secret) return { ok: false, status: 503, data: null };
      const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
        headers: { Authorization: `Bearer ${secret}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(6_000),
      });
      return { ok: response.ok, status: response.status, data: await response.json() };
    },
  });
  return NextResponse.json(result.body, { status: result.status, headers });
}
