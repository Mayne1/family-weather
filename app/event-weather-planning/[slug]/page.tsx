import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EventWeatherCheck from "../EventWeatherCheck";
import { eventWeatherPlanningPage, eventWeatherPlanningPages } from "../events";

export const dynamicParams = false;

export function generateStaticParams() {
  return eventWeatherPlanningPages.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const eventPage = eventWeatherPlanningPage(slug);
  if (!eventPage) return {};
  const description = `${eventPage.summary} Use a live forecast or five years of same-date weather history.`;
  return {
    title: `Free ${eventPage.name} | Family Weather`,
    description,
    alternates: { canonical: `/event-weather-planning/${eventPage.slug}` },
    openGraph: { title: `Free ${eventPage.name} | Family Weather`, description, type: "website", url: `/event-weather-planning/${eventPage.slug}` },
  };
}

export default async function EventWeatherPlanningDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const eventPage = eventWeatherPlanningPage(slug);
  if (!eventPage) notFound();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://thefamilyweather.com").replace(/\/+$/, "");
  const pageUrl = `${siteUrl}/event-weather-planning/${eventPage.slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: eventPage.name,
    url: pageUrl,
    description: eventPage.summary,
    about: { "@type": "Event", name: eventPage.activity },
    breadcrumb: { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Family Weather", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Event weather planners", item: `${siteUrl}/event-weather-planning` },
      { "@type": "ListItem", position: 3, name: eventPage.name, item: pageUrl },
    ] },
  };

  return (
    <div className="destinationPage eventPlanningPage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <header className="destinationHeader">
        <Link className="destinationBrand" href="/" aria-label="Family Weather home"><span className="brandMark" aria-hidden="true"><i /><i /><i /></span><span><strong>Family Weather</strong><small>Plan around what matters.</small></span></Link>
        <nav aria-label="Event weather navigation"><Link href="/event-weather-planning">All events</Link><Link href="/weather-planning">Destinations</Link><Link className="destinationHome" href="/">Home</Link></nav>
      </header>
      <main>
        <section className="destinationHero eventPlanningHero">
          <div><p className="destinationKicker">Weather planning guide</p><h1>{eventPage.name}</h1><p>{eventPage.summary}</p></div>
          <aside className="destinationCoordinates eventPlanningFocus"><small>{eventPage.icon} PLAN AROUND</small><strong>{eventPage.considerations[0]}</strong><span>Use your actual date and location below.</span></aside>
        </section>
        <EventWeatherCheck eventPage={eventPage} />
        <section className="eventGuideIntro"><p className="destinationKicker">Why weather belongs in the plan</p><h2>Weather can change more than the location.</h2><p>{eventPage.weatherWhy}</p></section>
        <section className="destinationExplainer" aria-label={`${eventPage.name} weather considerations`}>
          {eventPage.considerations.map((consideration, index) => <article key={consideration}><span>0{index + 1}</span><h2>{consideration}</h2><p>Check this against the event hours, the people attending, and the venue&apos;s rules before making the final call.</p></article>)}
        </section>
        <section className="eventPlanningGuide">
          <article><p className="destinationKicker">Weather-ready checklist</p><h2>Build flexibility into the event.</h2><ul>{eventPage.checklist.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article><p className="destinationKicker">Backup plan</p><h2>Decide before the weather decides for you.</h2><p>{eventPage.fallback}</p><p>Recheck the forecast as the event gets closer. Historical results help with early planning, but they do not predict the event day.</p></article>
        </section>
        <section className="destinationNextStep"><h2>When the date looks right, create the event, choose an invitation, and collect RSVPs.</h2><Link className="destinationPrimaryLink" href="/#planner"><span>Create the event</span><span aria-hidden="true">→</span></Link></section>
      </main>
      <footer className="destinationFooter"><strong>Family Weather</strong><span>Plan it. Invite them. Know the weather.</span><Link href="/event-weather-planning">Event planners</Link><Link href="/weather-planning">Destinations</Link><Link href="/privacy">Privacy</Link></footer>
    </div>
  );
}
