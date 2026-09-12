import type { Metadata } from "next";
import Link from "next/link";
import { weatherStories } from "./stories";

export const metadata: Metadata = {
  title: "Weather Stories: When Weather Changes the Plan | Family Weather",
  description: "Short stories about destination weddings, desert floods, Burning Man mud, windy cookouts and finding a better weather window for an event.",
  alternates: { canonical: "/weather-stories" },
  openGraph: {
    title: "Weather Stories | Family Weather",
    description: "Real and familiar stories about what happens when weather meets weddings, festivals, cookouts and family plans.",
    type: "website",
    url: "/weather-stories",
  },
};

export default function WeatherStoriesIndex() {
  return (
    <div className="destinationPage eventPlanningPage">
      <header className="destinationHeader">
        <Link className="destinationBrand" href="/" aria-label="Family Weather home"><span className="brandMark" aria-hidden="true"><i /><i /><i /></span><span><strong>Family Weather</strong><small>Plan around what matters.</small></span></Link>
        <nav aria-label="Weather stories navigation"><Link href="/event-weather-planning">Event guides</Link><Link href="/weather-planning">Destinations</Link><Link className="destinationHome" href="/">Home</Link></nav>
      </header>
      <main>
        <section className="destinationIndexHero">
          <p className="destinationKicker">Weather stories</p>
          <h1>The plan looked good.<br />Then the weather arrived.</h1>
          <p>Short stories about destination weather, family events and the ordinary assumptions that turn into the part everybody remembers.</p>
          <Link className="destinationPrimaryLink" href={`/weather-stories/${weatherStories[0].slug}`}><span>Read the first story</span><span aria-hidden="true">→</span></Link>
        </section>
        <section className="destinationGroup eventPlannerIndex">
          <div className="destinationGroupHeading"><h2>When weather changes the story</h2><span>{weatherStories.length} stories</span></div>
          <div className="destinationGrid">
            {weatherStories.map((story) => <Link href={`/weather-stories/${story.slug}`} key={story.slug}><small>{story.kicker}</small><h3>{story.shortTitle}</h3><p>{story.description}</p><span>Read the story →</span></Link>)}
          </div>
        </section>
      </main>
      <footer className="destinationFooter"><strong>Family Weather</strong><span>Weather information for the plans people actually make.</span><Link href="/event-weather-planning">Event guides</Link><Link href="/weather-planning">Destinations</Link><Link href="/privacy">Privacy</Link></footer>
    </div>
  );
}
