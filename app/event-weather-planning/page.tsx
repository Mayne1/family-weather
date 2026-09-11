import type { Metadata } from "next";
import Link from "next/link";
import { eventWeatherPlanningPages } from "./events";

export const metadata: Metadata = {
  title: "Free Event Weather Planners | Family Weather",
  description: "Check event weather free for weddings, birthdays, reunions, cookouts, graduations, showers, concerts and more using forecasts or same-date history.",
  alternates: { canonical: "/event-weather-planning" },
  openGraph: { title: "Event Weather Planners | Family Weather", description: "Choose your event, location, and real date to check a live forecast or five years of matching-date weather history.", type: "website", url: "/event-weather-planning" },
};

export default function EventWeatherPlanningIndex() {
  return (
    <div className="destinationPage eventPlanningPage">
      <header className="destinationHeader">
        <Link className="destinationBrand" href="/" aria-label="Family Weather home"><span className="brandMark" aria-hidden="true"><i /><i /><i /></span><span><strong>Family Weather</strong><small>Plan around what matters.</small></span></Link>
        <nav aria-label="Event weather navigation"><Link href="/weather-planning">Destinations</Link><Link href="/#almanac">Almanac</Link><Link className="destinationHome" href="/">Home</Link></nav>
      </header>
      <main>
        <section className="destinationIndexHero">
          <p className="destinationKicker">Free event weather planners</p>
          <h1>Plan the occasion.<br />Know the weather.</h1>
          <p>Start with what you are celebrating. Each guide checks your actual location and date, then uses a live forecast when available or five years of matching-date history for plans farther away.</p>
          <Link className="destinationPrimaryLink" href={`/event-weather-planning/${eventWeatherPlanningPages[0].slug}`}><span>Choose an event</span><span aria-hidden="true">→</span></Link>
        </section>
        <section className="destinationGroup eventPlannerIndex">
          <div className="destinationGroupHeading"><h2>What are you planning?</h2><span>{eventWeatherPlanningPages.length} event guides</span></div>
          <div className="destinationGrid">
            {eventWeatherPlanningPages.map((eventPage) => <Link href={`/event-weather-planning/${eventPage.slug}`} key={eventPage.slug}><small>{eventPage.icon} Event guide</small><h3>{eventPage.name}</h3><p>{eventPage.summary}</p><span>Plan with weather →</span></Link>)}
          </div>
        </section>
        <section className="destinationNextStep eventIndexNextStep"><h2>Already know where you are going? Explore weather planning for 48 destinations worldwide.</h2><Link className="destinationPrimaryLink" href="/weather-planning"><span>Browse destinations</span><span aria-hidden="true">→</span></Link></section>
      </main>
      <footer className="destinationFooter"><strong>Family Weather</strong><span>Plan it. Invite them. Know the weather.</span><Link href="/weather-planning">Destinations</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></footer>
    </div>
  );
}
