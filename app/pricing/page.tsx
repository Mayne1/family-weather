import type { Metadata } from "next";
import Link from "next/link";
import PublicChrome from "../components/PublicChrome";

export const metadata: Metadata = { title: "Family Weather Event Pricing", description: "Create and share an event for free, or remove ads and affiliate promotions from that event for $1.99.", alternates: { canonical: "/pricing" } };

const plans = [
  ["Free Event", "$0", "Check the weather, design an invitation, share one link, and collect RSVPs. Ads or affiliate promotions may appear on this event’s guest pages."],
  ["Remove Promotions", "$1.99", "Keep every feature and remove ads and affiliate promotions from this event. One payment for this event—no subscription."],
] as const;

export default function PricingPage() {
  return <PublicChrome><main className="publicMain"><section className="publicHero compactHero"><p className="publicKicker">One event at a time</p><h1>Every useful feature.<br /><em>Free to share.</em></h1><p>Create the event, share the link anywhere, and collect replies for free. Pay $1.99 only if you want ads and affiliate promotions removed from that event.</p></section><section className="pricingPageGrid">{plans.map(([name, price, copy], index) => <article className={index === 1 ? "featured" : ""} key={name}><small>{name}</small><strong>{price}</strong><p>{copy}</p>{index === 0 ? <span>GOOD PLACE TO START</span> : null}</article>)}</section><section className="pricingExplanation"><div><h2>Shareable links are not metered.</h2><p>Copy your invitation link or use your device’s share menu. Guests open the link and RSVP. Share it with as many people as you want.</p></div><div><h2>$1.99 applies to one event.</h2><p>The free and paid versions have the same planning, invitation, sharing, and RSVP tools. The payment only removes ads and affiliate promotions from that event.</p></div></section><section className="publicClosing"><h2>Plan the day before paying for anything.</h2><div className="publicActionRow"><Link className="publicPrimary" href="/plan">Check a plan <span>→</span></Link><a className="publicSecondary" href="/create-event">Create an event</a></div></section></main></PublicChrome>;
}
