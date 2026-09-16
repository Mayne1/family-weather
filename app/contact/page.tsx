import type { Metadata } from "next";
import PublicChrome from "../components/PublicChrome";

export const metadata: Metadata = { title: "Contact Family Weather", description: "Contact Family Weather about the planner, events, invitations, RSVP management, account access, or billing.", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  return <PublicChrome><main className="publicMain"><section className="publicHero compactHero"><p className="publicKicker">Contact</p><h1>Tell us what happened.<br /><em>Include the useful details.</em></h1><p>Questions about weather results, saved events, invitations, RSVPs, account access, or billing can be sent directly to Family Weather.</p></section><section className="contactPanel"><div><h2>Email Family Weather</h2><a href="mailto:contact@thefamilyweather.com">contact@thefamilyweather.com</a><p>Include the email address used for your account and the event ID when the question concerns a saved event. Never send a password or payment-card number.</p></div><div className="contactTopics"><article><strong>Weather result</strong><p>Include the activity, location, date, and what appeared incorrect.</p></article><article><strong>Event or invitation</strong><p>Include the event ID and describe the step where the problem occurred.</p></article><article><strong>Billing</strong><p>Include the event ID and the package name. Do not email complete card information.</p></article></div></section></main></PublicChrome>;
}
