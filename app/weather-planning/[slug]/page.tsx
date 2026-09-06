import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import WeatherDateCheck from "../WeatherDateCheck";
import { weatherPlanningDestination, weatherPlanningDestinations } from "../destinations";

export const dynamicParams = false;

export function generateStaticParams() {
  return weatherPlanningDestinations.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const destination = weatherPlanningDestination(slug);
  if (!destination) return {};
  const title = `${destination.name} Weather by Date | Family Weather`;
  const description = `Plan ${destination.planningFocus} with live forecast data and five years of same-date weather history for ${destination.name}.`;
  return {
    title,
    description,
    alternates: { canonical: `/weather-planning/${destination.slug}` },
    openGraph: { title, description, type: "website", url: `/weather-planning/${destination.slug}` },
  };
}

export default async function DestinationWeatherPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = weatherPlanningDestination(slug);
  if (!destination) notFound();

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://thefamilyweather.com").replace(/\/+$/, "");
  const pageUrl = `${siteUrl}/weather-planning/${destination.slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${destination.name} weather planning`,
    url: pageUrl,
    description: `Weather planning for ${destination.planningFocus} in ${destination.name}.`,
    about: {
      "@type": "Place",
      name: destination.name,
      geo: { "@type": "GeoCoordinates", latitude: destination.lat, longitude: destination.lon },
    },
    breadcrumb: { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Family Weather", item: siteUrl }, { "@type": "ListItem", position: 2, name: "Destination weather planning", item: `${siteUrl}/weather-planning` }, { "@type": "ListItem", position: 3, name: destination.name, item: pageUrl }] },
  };

  return (
    <div className="destinationPage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <header className="destinationHeader">
        <Link className="destinationBrand" href="/" aria-label="Family Weather home">
          <span className="brandMark" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>Family Weather</strong><small>Plan around what matters.</small></span>
        </Link>
        <nav aria-label="Destination weather navigation">
          <Link href="/weather-planning">All destinations</Link>
          <Link href="/#almanac">Almanac</Link>
          <Link className="destinationHome" href="/">Home</Link>
        </nav>
      </header>
      <main>
        <section className="destinationHero">
          <div>
            <p className="destinationKicker">Weather planning guide</p>
            <h1>{destination.name}</h1>
            <p>Check the weather for your date before planning {destination.planningFocus}. Near dates use forecast data; dates beyond the forecast window use the same calendar date from the previous five years.</p>
          </div>
          <aside className="destinationCoordinates">
            <small>RESOLVED LOCATION</small>
            <strong>{destination.name}</strong>
            <span>{destination.lat.toFixed(4)}, {destination.lon.toFixed(4)}</span>
          </aside>
        </section>

        <WeatherDateCheck destination={destination} />

        <section className="destinationExplainer" aria-label="How destination weather planning works">
          <article><span>01</span><h2>Choose your real date</h2><p>Check a vacation day, ceremony, excursion, or outdoor event instead of relying on a broad monthly average.</p></article>
          <article><span>02</span><h2>Use the right data</h2><p>Family Weather automatically uses live forecast data when available and matching-date history when the date is farther away.</p></article>
          <article><span>03</span><h2>Plan with context</h2><p>Compare temperature, rain, wind, and recent yearly records, then keep a backup plan for conditions that can change.</p></article>
        </section>

        <section className="destinationNextStep">
          <h2>Planning an event in {destination.shortName}? Turn the weather check into a complete plan and invitation.</h2>
          <Link className="destinationPrimaryLink" href="/#planner"><span>Plan an event</span><span aria-hidden="true">→</span></Link>
        </section>
      </main>
      <footer className="destinationFooter"><strong>Family Weather</strong><span>Plan it. Invite them. Know the weather.</span><Link href="/weather-planning">Destinations</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></footer>
    </div>
  );
}
