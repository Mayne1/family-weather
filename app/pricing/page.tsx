import type { Metadata } from "next";
import Link from "next/link";
import PublicChrome from "../components/PublicChrome";

export const metadata: Metadata = { title: "Family Weather Event Pricing", description: "Compare Family Weather event options for weather planning, digital invitations, shareable links, RSVP management, and direct email delivery.", alternates: { canonical: "/pricing" } };

const plans = [
  ["Free Event", "$0", "Plan the weather, design the invitation, share your link, manage RSVPs, and send up to 10 direct emails. Family Weather promotion may appear."],
  ["Clean Event", "$1.99", "Keep the planning and invitation experience with a cleaner guest presentation and a small Family Weather signature."],
  ["Event Plus", "$5.99", "Includes 25 direct emails and removes advertising and promotional branding from the guest presentation."],
  ["Large Event", "$19.99", "Includes 100 direct emails, the shareable invitation link, RSVP management, and the upgraded presentation."],
  ["Bigger Event", "$39.99", "Includes 250 direct emails for larger family, school, community, or organization gatherings."],
  ["Organization Event", "$69.99", "Includes 500 direct emails for organizations coordinating a larger event."],
] as const;

export default function PricingPage() {
  return <PublicChrome><main className="publicMain"><section className="publicHero compactHero"><p className="publicKicker">One event at a time</p><h1>Start free.<br /><em>Upgrade when the event needs it.</em></h1><p>Checking weather never requires a purchase. Event upgrades apply to the event you choose—there is no recurring subscription.</p></section><section className="pricingPageGrid">{plans.map(([name, price, copy], index) => <article className={index === 2 ? "featured" : ""} key={name}><small>{name}</small><strong>{price}</strong><p>{copy}</p>{index === 0 ? <span>GOOD PLACE TO START</span> : null}</article>)}</section><section className="pricingExplanation"><div><h2>Shareable links are not metered.</h2><p>The email allowance covers messages delivered directly by Family Weather. You can distribute the event’s shareable invitation link through your own email, text messages, social media, or other communication channels.</p></div><div><h2>Choose later, not before designing.</h2><p>Create the event and invitation first. Family Weather presents the relevant package choices after you can see what you are purchasing.</p></div></section><section className="publicClosing"><h2>Plan the day before paying for anything.</h2><div className="publicActionRow"><Link className="publicPrimary" href="/plan">Check a plan <span>→</span></Link><a className="publicSecondary" href="/create-event">Create an event</a></div></section></main></PublicChrome>;
}
