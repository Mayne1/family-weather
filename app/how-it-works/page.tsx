import type { Metadata } from "next";
import Link from "next/link";
import PublicChrome from "../components/PublicChrome";

export const metadata: Metadata = { title: "How Family Weather Works", description: "See how Family Weather turns forecasts and five-year weather history into useful activity and event-planning guidance.", alternates: { canonical: "/how-it-works" } };

export default function HowItWorksPage() {
  return <PublicChrome><main className="publicMain"><section className="publicHero"><p className="publicKicker">Forecast → decision → invitation</p><h1>Weather information<br /><em>with somewhere to go.</em></h1><p>Family Weather starts with the thing you intend to do. It then checks the place, date, setting, and relevant weather before giving you a planning window and an optional path to invite other people.</p><div className="publicActionRow"><Link className="publicPrimary" href="/plan">Try the planner <span>→</span></Link><Link className="publicSecondary" href="/weather-history">Explore weather history</Link></div></section><section className="processSteps">{[
    ["01", "Name the real activity", "Yard work and an outdoor wedding should not receive identical advice. Tell Family Weather what people will actually be doing."],
    ["02", "Search the real place", "Use an address, venue, landmark, city, postal code, or destination. Ambiguous names are resolved before the weather is checked."],
    ["03", "Choose the actual date", "Near-term plans use available forecasts. Farther-out plans use five years of matching-date history and are clearly labeled as historical guidance."],
    ["04", "Read the weather fit", "See a score, useful time window, temperatures, rain, wind, and plain-language considerations instead of interpreting a wall of numbers."],
    ["05", "Create an event if needed", "A personal activity can end with the answer. A gathering can continue into event details, invitation design, sharing, and RSVP management."],
  ].map(([number, title, copy]) => <article key={number}><span>{number}</span><div><h2>{title}</h2><p>{copy}</p></div></article>)}</section><section className="scenarioSection"><div><p className="publicKicker">Built from ordinary problems</p><h2>Plans rarely fail because somebody forgot the temperature.</h2></div><div className="scenarioGrid"><article><h3>Yard work</h3><p>Avoid doing the heaviest work during the hottest or coldest part of the day.</p></article><article><h3>Cookout</h3><p>Wind can disrupt the table even when cooking remains possible.</p></article><article><h3>Guests traveling</h3><p>The weather at the destination can support a better arrival window.</p></article><article><h3>Outdoor event</h3><p>Rain, wind, and heat can change whether the plan needs a backup.</p></article></div></section></main></PublicChrome>;
}
