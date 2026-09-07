import { NextRequest, NextResponse } from "next/server";
import { backendUrl, publicOrigin } from "../../../../lib/serverConfig";
import { commercePlan, COMMERCE_PLANS } from "../../../../lib/commercePlans";
import { enforceRateLimit } from "../../../../lib/requestSecurity";

const PAID_CODES = new Set<string>(COMMERCE_PLANS.filter((plan) => plan.priceCents > 0).map((plan) => plan.code));

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const limited = enforceRateLimit(request, "checkout", 10, 10 * 60_000);
  if (limited) return limited;
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return NextResponse.json({ ok: false, error: "Sign in before purchasing this event." }, { status: 401 });
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) return NextResponse.json({ ok: false, error: "Event purchasing is not configured yet." }, { status: 503 });

  try {
    const { id } = await context.params;
    const body = await request.json();
    const productCode = String(body.product_code || "");
    if (!PAID_CODES.has(productCode)) return NextResponse.json({ ok: false, error: "Choose a valid event upgrade." }, { status: 400 });
    const target = commercePlan(productCode);

    const entitlementResponse = await fetch(backendUrl(`/events/${encodeURIComponent(id)}/entitlement`), { headers: { Authorization: authorization }, cache: "no-store" });
    const entitlementData = await entitlementResponse.json();
    if (!entitlementResponse.ok || !entitlementData.ok) return NextResponse.json({ ok: false, error: "Only the event owner can upgrade this event." }, { status: entitlementResponse.status });
    const current = entitlementData.entitlement;
    if (!current || current.status === "legacy" || target.rank <= Number(current.plan_rank)) return NextResponse.json({ ok: false, error: "This event already has that level of access." }, { status: 409 });
    if (current.pending_product_code === target.code && current.checkout_url) return NextResponse.json({ ok: true, checkout_url: current.checkout_url });
    if (current.pending_product_code && current.checkout_url) return NextResponse.json({ ok: false, error: "Finish or cancel the pending checkout before choosing a different upgrade." }, { status: 409 });

    const amountDue = target.priceCents - Number(current.amount_cents || 0);
    if (amountDue <= 0) return NextResponse.json({ ok: false, error: "This event does not require that upgrade." }, { status: 409 });

    const origin = publicOrigin(request);
    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.set("line_items[0][price_data][currency]", "usd");
    form.set("line_items[0][price_data][unit_amount]", String(amountDue));
    form.set("line_items[0][price_data][product_data][name]", `Family Weather ${target.name}`);
    form.set("line_items[0][quantity]", "1");
    form.set("client_reference_id", String(id));
    form.set("success_url", `${origin}/events/${encodeURIComponent(id)}?payment=processing`);
    form.set("cancel_url", `${origin}/events/${encodeURIComponent(id)}?payment=cancelled`);
    form.set("metadata[event_id]", String(id));
    form.set("metadata[product_code]", target.code);
    form.set("payment_intent_data[metadata][event_id]", String(id));
    form.set("payment_intent_data[metadata][product_code]", target.code);

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    const stripeData = await stripeResponse.json();
    const sessionId = String(stripeData?.id || "");
    const checkoutUrl = String(stripeData?.url || "");
    let parsed: URL;
    try { parsed = new URL(checkoutUrl); } catch { return NextResponse.json({ ok: false, error: "Secure checkout could not be started." }, { status: 502 }); }
    if (!stripeResponse.ok || !sessionId.startsWith("cs_") || parsed.protocol !== "https:" || parsed.hostname !== "checkout.stripe.com") return NextResponse.json({ ok: false, error: "Secure checkout could not be started." }, { status: 502 });

    const saveResponse = await fetch(backendUrl(`/events/${encodeURIComponent(id)}/entitlement/checkout`), {
      method: "POST",
      headers: { Authorization: authorization, "Content-Type": "application/json" },
      body: JSON.stringify({ product_code: target.code, stripe_checkout_session_id: sessionId, stripe_checkout_url: parsed.toString() }),
      cache: "no-store",
    });
    if (!saveResponse.ok) return NextResponse.json({ ok: false, error: "Checkout could not be attached to this event." }, { status: 502 });
    return NextResponse.json({ ok: true, checkout_url: parsed.toString() });
  } catch (error) {
    console.error("Event checkout failed", error);
    return NextResponse.json({ ok: false, error: "Secure checkout is temporarily unavailable." }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return NextResponse.json({ ok: false, error: "Sign in before changing checkout." }, { status: 401 });
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) return NextResponse.json({ ok: false, error: "Event purchasing is not configured yet." }, { status: 503 });
  try {
    const { id } = await context.params;
    const entitlementResponse = await fetch(backendUrl(`/events/${encodeURIComponent(id)}/entitlement`), { headers: { Authorization: authorization }, cache: "no-store" });
    const data = await entitlementResponse.json();
    const sessionId = String(data?.entitlement?.checkout_session_id || "");
    if (!entitlementResponse.ok || !sessionId.startsWith("cs_")) return NextResponse.json({ ok: false, error: "No pending checkout was found." }, { status: 404 });
    const stripeHeaders = { Authorization: `Bearer ${secret}` };
    const statusResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, { headers: stripeHeaders, cache: "no-store", signal: AbortSignal.timeout(10_000) });
    const session = await statusResponse.json();
    if (!statusResponse.ok) return NextResponse.json({ ok: false, error: "Checkout status could not be verified." }, { status: 502 });
    if (session.payment_status === "paid" || session.status === "complete") return NextResponse.json({ ok: false, error: "Payment was already completed. Refresh this event to see the upgrade." }, { status: 409 });
    if (session.status === "open") {
      const expireResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}/expire`, { method: "POST", headers: stripeHeaders, cache: "no-store", signal: AbortSignal.timeout(10_000) });
      if (!expireResponse.ok) return NextResponse.json({ ok: false, error: "Checkout could not be cancelled safely." }, { status: 409 });
    }
    const clearResponse = await fetch(backendUrl(`/events/${encodeURIComponent(id)}/entitlement/checkout`), { method: "DELETE", headers: { Authorization: authorization, "Content-Type": "application/json" }, body: JSON.stringify({ stripe_checkout_session_id: sessionId }), cache: "no-store" });
    return NextResponse.json({ ok: clearResponse.ok }, { status: clearResponse.status });
  } catch (error) {
    console.error("Checkout cancellation failed", error);
    return NextResponse.json({ ok: false, error: "Checkout could not be cancelled safely." }, { status: 502 });
  }
}
