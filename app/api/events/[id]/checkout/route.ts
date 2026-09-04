import { NextRequest, NextResponse } from "next/server";
import { backendUrl, publicOrigin } from "../../../../lib/serverConfig";
import type { DistributionMethod } from "../../../../lib/entitlementTypes";
import { enforceRateLimit } from "../../../../lib/requestSecurity";

const PRODUCT_CODE = "family_weather_launch_event_599";
const METHODS = new Set<DistributionMethod>(["email", "share_link"]);

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const limited = enforceRateLimit(request, "checkout", 10, 10 * 60_000);
  if (limited) return limited;
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return NextResponse.json({ ok: false, error: "Sign in before purchasing this event." }, { status: 401 });
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const priceId = process.env.STRIPE_PRICE_ID?.trim();
  if (!secret || !priceId?.startsWith("price_")) return NextResponse.json({ ok: false, error: "Event purchasing is not configured yet." }, { status: 503 });
  try {
    const { id } = await context.params;
    const body = await request.json();
    const method = String(body.distribution_method || "") as DistributionMethod;
    if (!METHODS.has(method)) return NextResponse.json({ ok: false, error: "Choose email delivery or a shareable link." }, { status: 400 });

    const entitlementResponse = await fetch(backendUrl(`/events/${encodeURIComponent(id)}/entitlement`), { headers: { Authorization: authorization }, cache: "no-store" });
    const entitlementData = await entitlementResponse.json();
    if (!entitlementResponse.ok || !entitlementData.ok) return NextResponse.json({ ok: false, error: "Only the event owner can purchase this event." }, { status: entitlementResponse.status });
    if (["paid", "legacy"].includes(String(entitlementData.entitlement?.status || ""))) return NextResponse.json({ ok: false, error: "This event is already enabled." }, { status: 409 });
    if (entitlementData.entitlement?.status === "pending" && entitlementData.entitlement?.checkout_url) return NextResponse.json({ ok: true, checkout_url: entitlementData.entitlement.checkout_url });

    const priceResponse = await fetch(`https://api.stripe.com/v1/prices/${encodeURIComponent(priceId)}`, { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store", signal: AbortSignal.timeout(10_000) });
    const price = await priceResponse.json();
    if (!priceResponse.ok || price?.active !== true || Number(price?.unit_amount) !== 599 || String(price?.currency || "").toLowerCase() !== "usd" || price?.recurring) return NextResponse.json({ ok: false, error: "The $5.99 event price is not configured correctly." }, { status: 503 });

    const origin = publicOrigin(request);
    const form = new URLSearchParams();
    form.set("mode", "payment"); form.set("line_items[0][price]", priceId); form.set("line_items[0][quantity]", "1");
    form.set("client_reference_id", String(id));
    form.set("success_url", `${origin}/events/${encodeURIComponent(id)}?payment=processing`);
    form.set("cancel_url", `${origin}/events/${encodeURIComponent(id)}?payment=cancelled`);
    form.set("metadata[event_id]", String(id)); form.set("metadata[distribution_method]", method); form.set("metadata[product_code]", PRODUCT_CODE);
    form.set("payment_intent_data[metadata][event_id]", String(id)); form.set("payment_intent_data[metadata][product_code]", PRODUCT_CODE);
    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form, cache: "no-store", signal: AbortSignal.timeout(12_000) });
    const stripeData = await stripeResponse.json();
    const sessionId = String(stripeData?.id || ""); const checkoutUrl = String(stripeData?.url || "");
    let parsed: URL; try { parsed = new URL(checkoutUrl); } catch { return NextResponse.json({ ok: false, error: "Secure checkout could not be started." }, { status: 502 }); }
    if (!stripeResponse.ok || !sessionId.startsWith("cs_") || parsed.protocol !== "https:" || parsed.hostname !== "checkout.stripe.com") return NextResponse.json({ ok: false, error: "Secure checkout could not be started." }, { status: 502 });
    const saveResponse = await fetch(backendUrl(`/events/${encodeURIComponent(id)}/entitlement/checkout`), { method: "POST", headers: { Authorization: authorization, "Content-Type": "application/json" }, body: JSON.stringify({ distribution_method: method, stripe_checkout_session_id: sessionId, stripe_checkout_url: parsed.toString() }), cache: "no-store" });
    if (!saveResponse.ok) return NextResponse.json({ ok: false, error: "Checkout could not be attached to this event." }, { status: 502 });
    return NextResponse.json({ ok: true, checkout_url: parsed.toString() });
  } catch (error) { console.error("Event checkout failed", error); return NextResponse.json({ ok: false, error: "Secure checkout is temporarily unavailable." }, { status: 502 }); }
}
