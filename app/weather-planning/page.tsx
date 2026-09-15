import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Destination Weather Planning | Family Weather",
  description: "Use Family Weather to check a destination and date with a live forecast or five years of same-date weather history.",
  alternates: { canonical: "/weather-planning" },
};

export default function WeatherPlanningPage() {
  return (
    <div className="destinationPage">
      <header className="destinationHeader">
        <Link className="destinationBrand" href="/" aria-label="Family Weather home">
          <span className="brandMark" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>Family Weather</strong><small>Plan around what matters.</small></span>
        </Link>
        <nav aria-label="Destination weather navigation">
          <Link href="/event-weather-planning">Event planners</Link>
          <Link href="/#almanac">Almanac</Link>
          <Link href="/events">My events</Link>
          <Link className="destinationHome" href="/">Home</Link>
        </nav>
      </header>
      <main>
        <section className="destinationIndexHero">
          <p className="destinationKicker">Destination weather planning</p>
          <h1>Plan the date.<br />Know the weather.</h1>
          <p>Enter the destination and the day you are considering. Family Weather uses a live forecast when the date is close or five years of matching-date history when you are planning farther ahead.</p>
          <Link className="destinationPrimaryLink" href="/#planner"><span>Check a destination</span><span aria-hidden="true">→</span></Link>
        </section>
        <section className="destinationNextStep">
          <h2>One planner works for every destination.</h2>
          <p>You do not need a separate city page. Search the actual address, city, landmark, venue, or destination in the main planner and check the date that matters to you.</p>
          <Link className="destinationPrimaryLink" href="/#planner"><span>Open the planner</span><span aria-hidden="true">→</span></Link>
        </section>
      </main>
      <footer className="destinationFooter">
        <strong>Family Weather</strong><span>Plan it. Invite them. Know the weather.</span>
        <Link href="/event-weather-planning">Event planners</Link>
        <Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link>
      </footer>
    </div>
  );
}
