import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Event Weather Planning | Family Weather",
  description: "Check the weather for the event, location and date that matter to you with one Family Weather planner.",
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
          <p className="destinationKicker">Event weather planning</p>
          <h1>Plan the occasion.<br />Know the weather.</h1>
          <p>Tell Family Weather what you are doing, where you are doing it and when. The same planner works for a wedding, cookout, birthday, reunion, concert or an ordinary afternoon outside.</p>
          <Link className="destinationPrimaryLink" href="/#planner"><span>Check an event</span><span aria-hidden="true">→</span></Link>
        </section>
        <section className="destinationNextStep eventIndexNextStep"><h2>One useful tool instead of twelve repeated guides.</h2><p>Use your real activity, location and date. Family Weather will check the conditions that can affect the plan and give you a weather window when the forecast supports one.</p><Link className="destinationPrimaryLink" href="/#planner"><span>Open the planner</span><span aria-hidden="true">→</span></Link></section>
      </main>
      <footer className="destinationFooter"><strong>Family Weather</strong><span>Plan it. Invite them. Know the weather.</span><Link href="/weather-planning">Destination planning</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></footer>
    </div>
  );
}
