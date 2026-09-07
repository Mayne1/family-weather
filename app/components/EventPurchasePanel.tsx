"use client";

import { FormEvent, useState } from "react";
import { COMMERCE_PLANS, formatPlanPrice } from "../lib/commercePlans";
import type { EventEntitlement } from "../lib/entitlementTypes";

type Props = { eventId: string; authorization: string; entitlement: EventEntitlement; continueHref?: string };

export default function EventPurchasePanel({ eventId, authorization, entitlement, continueHref }: Props) {
  const [loadingCode, setLoadingCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  if (entitlement.status === "legacy") return null;
  const upgrades = COMMERCE_PLANS.filter((plan) => plan.priceCents > 0 && plan.rank > entitlement.plan_rank);

  async function checkout(productCode: string) {
    setLoadingCode(productCode); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/checkout`, {
        method: "POST",
        headers: { Authorization: authorization, "Content-Type": "application/json" },
        body: JSON.stringify({ product_code: productCode }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Secure checkout could not be started.");
      window.location.assign(data.checkout_url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Secure checkout could not be started.");
      setLoadingCode("");
    }
  }

  async function redeemPromo(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const code = String(new FormData(formEvent.currentTarget).get("promo") || "").trim();
    if (!code) return;
    setPromoLoading(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/promo`, {
        method: "POST",
        headers: { Authorization: authorization, "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Promotion code could not be applied.");
      setMessage(`${data.entitlement.plan_name} is active. Refreshing your event…`);
      window.setTimeout(() => window.location.reload(), 700);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Promotion code could not be applied.");
      setPromoLoading(false);
    }
  }

  async function cancelCheckout() {
    setLoadingCode("cancel"); setError("");
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/checkout`, { method: "DELETE", headers: { Authorization: authorization } });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Checkout could not be cancelled.");
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Checkout could not be cancelled.");
      setLoadingCode("");
    }
  }

  return <section className="launchOffer" aria-labelledby={`launch-offer-${eventId}`}>
    <div className="launchOfferHeading"><div><p className="launchEyebrow">Your event access</p><h3 id={`launch-offer-${eventId}`}>{entitlement.plan_name}</h3></div><span>{entitlement.status === "free" ? "No card required" : "One event · one payment"}</span></div>
    <p className="launchOfferIntro">Planning, invitation design, your shareable link, and RSVP management are included. Upgrade only for a cleaner guest presentation or more Family Weather email delivery.</p>
    {continueHref ? <a className="continueFreeEvent" href={continueHref}>Continue to invitations and RSVP management <span>→</span></a> : null}

    {entitlement.pending_product_code && entitlement.checkout_url ? <div className="pendingUpgrade" aria-live="polite"><div><strong>Checkout waiting</strong><span>Your event is still safe at its current level until payment is confirmed.</span></div><div><button type="button" onClick={() => window.location.assign(entitlement.checkout_url!)}>Continue secure checkout</button><button className="cancelPending" type="button" onClick={cancelCheckout} disabled={loadingCode === "cancel"}>{loadingCode === "cancel" ? "Cancelling…" : "Cancel"}</button></div></div> : null}

    {upgrades.length ? <div className="planUpgradeGrid">
      {upgrades.map((plan) => {
        const amountDue = plan.priceCents - entitlement.amount_cents;
        return <article className={plan.code === "event_plus_599" ? "featured" : ""} key={plan.code}>
          <small>{plan.emailLimit >= 100 ? "MORE DELIVERY" : plan.code === "clean_event_199" ? "CLEAN PRESENTATION" : "POPULAR UPGRADE"}</small>
          <h4>{plan.name}</h4>
          <strong>{formatPlanPrice(plan.priceCents)}</strong><span>total event value</span>
          <ul><li>{plan.emailLimit} direct email invitations</li><li>Share your link anywhere</li><li>No advertised RSVP limit</li><li>{plan.presentation === "clean" ? "No ads · small Family Weather signature" : "No ads or promotional branding"}</li></ul>
          <button type="button" onClick={() => checkout(plan.code)} disabled={Boolean(loadingCode)}>{loadingCode === plan.code ? "Opening checkout…" : `${entitlement.amount_cents ? "Upgrade" : "Choose"} · ${formatPlanPrice(amountDue)} due`}<span>→</span></button>
        </article>;
      })}
    </div> : <p className="maxPlanNotice">This event already has Family Weather’s largest direct-email allowance.</p>}

    <form className="promoCodeForm" onSubmit={redeemPromo}><label><span>Have a Family Weather promotion code?</span><input name="promo" autoComplete="off" maxLength={15} placeholder="FW-XXXXXXXXXXXX" /></label><button type="submit" disabled={promoLoading}>{promoLoading ? "Applying…" : "Apply code"}</button></form>
    {message ? <p className="inviteSuccess" role="status">{message}</p> : null}
    {error ? <p className="formError" role="alert">{error}</p> : null}
  </section>;
}
