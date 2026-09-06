import type { Metadata } from "next";
import Link from "next/link";
import { destinationResearchSources, weatherPlanningDestinations } from "./destinations";

export const metadata: Metadata = {
  title: "Destination Weather Planning | Family Weather",
  description: "Check forecast-range weather or five years of same-date weather history for popular cities, vacation destinations, national parks, and landmarks.",
  alternates: { canonical: "/weather-planning" },
};

const groups = ["United States", "International destinations", "National parks and landmarks"];

export default function WeatherPlanningPage() {
  return (
    <div className="destinationPage">
      <header className="destinationHeader">
        <Link className="destinationBrand" href="/" aria-label="Family Weather home">
          <span className="brandMark" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>Family Weather</strong><small>Plan around what matters.</small></span>
        </Link>
        <nav aria-label="Destination weather navigation">
          <Link href="/#almanac">Almanac</Link>
          <Link href="/events">My events</Link>
          <Link className="destinationHome" href="/">Home</Link>
        </nav>
      </header>
      <main>
        <section className="destinationIndexHero">
          <p className="destinationKicker">Destination weather planner</p>
          <h1>Plan the date.<br />Know the weather.</h1>
          <p>Explore useful destination pages built around real coordinates. Check near-term forecasts or compare the same calendar date across the previous five years before you plan a trip, outing, or outdoor event.</p>
          <Link className="destinationPrimaryLink" href={`/weather-planning/${weatherPlanningDestinations[0].slug}`}><span>Explore a destination</span><span aria-hidden="true">→</span></Link>
        </section>

        {groups.map((group) => {
          const destinations = weatherPlanningDestinations.filter((destination) => destination.region === group);
          return (
            <section className="destinationGroup" key={group}>
              <div className="destinationGroupHeading"><h2>{group}</h2><span>{destinations.length} destinations</span></div>
              <div className="destinationGrid">
                {destinations.map((destination) => (
                  <Link href={`/weather-planning/${destination.slug}`} key={destination.slug}>
                    <small>{destination.type}</small>
                    <h3>{destination.name}</h3>
                    <p>Weather guidance for {destination.planningFocus}.</p>
                    <span>Plan with weather →</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <section className="destinationSources">
          <h2>Built from legitimate travel research</h2>
          <p>Destination selection is informed by established public travel and tourism sources. Weather results come from Family Weather&apos;s live forecast and historical weather services—not copied travel-site forecasts or fabricated destination data.</p>
          <ul>{destinationResearchSources.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer">{source.name}</a></li>)}</ul>
        </section>
      </main>
      <footer className="destinationFooter">
        <strong>Family Weather</strong><span>Plan it. Invite them. Know the weather.</span>
        <Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link>
      </footer>
    </div>
  );
}
