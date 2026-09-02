"use client";

import { useState } from "react";
import type { DistributionMethod, EventEntitlement } from "../lib/entitlementTypes";

type Props = { eventId: string; authorization: string; entitlement?: EventEntitlement | null };

export default function EventPurchasePanel({ eventId, authorization, entitlement }: Props) {
  const [method, setMethod] = useState<DistributionMethod>("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (entitlement?.status === "pending") {
    return <section className="launchOffer paymentPending" aria-live="polite"><p className="launchEyebrow">Payment confirmation</p><h3>Stripe is confirming this event.</h3><p>Complete checkout if needed, or check again after payment.</p><div>{entitlement.checkout_url ? <button type="button" onClick={() => window.location.assign(entitlement.checkout_url!)}>Continue secure checkout</button> : null}<button type="button" onClick={() => window.location.reload()}>Check again</button></div></section>;
  }

  async function checkout() {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/checkout`, { method: "POST", headers: { Authorization: authorization, "Content-Type": "application/json" }, body: JSON.stringify({ distribution_method: method }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Secure checkout could not be started.");
      window.location.assign(data.checkout_url);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Secure checkout could not be started."); setLoading(false); }
  }

  return <section className="launchOffer" aria-labelledby={`launch-offer-${eventId}`}>
    <div className="launchOfferHeading"><div><p className="launchEyebrow">Introductory launch price</p><h3 id={`launch-offer-${eventId}`}>Enable this event for <strong>$5.99</strong></h3></div><span>One event · one payment</span></div>
    <p className="launchOfferIntro">Weather planning, your invitation design, RSVP management, and your host dashboard are included. Choose how this event will be shared.</p>
    <div className="distributionChoices"><button className={method === "email" ? "active" : ""} type="button" onClick={() => setMethod("email")} aria-pressed={method === "email"}><small>OPTION A</small><strong>Family Weather Email</strong><span>Up to 25 invitations delivered by Family Weather</span></button><div className="choiceOr">OR</div><button className={method === "share_link" ? "active" : ""} type="button" onClick={() => setMethod("share_link")} aria-pressed={method === "share_link"}><small>OPTION B</small><strong>Share It Yourself</strong><span>One shareable invitation link · Up to 50 guest RSVPs</span><em>You use your own email, Messages, social media, or other communication tools.</em></button></div>
    <button className="purchaseEventButton" type="button" onClick={checkout} disabled={loading}>{loading ? "Opening secure checkout…" : "Purchase this event — $5.99"}<span>→</span></button>
    {error ? <p className="formError" role="alert">{error}</p> : null}
  </section>;
}
