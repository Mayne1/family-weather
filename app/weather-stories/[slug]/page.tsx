import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { weatherStories, weatherStory } from "../stories";

export const dynamicParams = false;

export function generateStaticParams() {
  return weatherStories.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const story = weatherStory(slug);
  if (!story) return {};
  return {
    title: `${story.title} | Family Weather`,
    description: story.description,
    alternates: { canonical: `/weather-stories/${story.slug}` },
    openGraph: { title: story.title, description: story.description, type: "article", url: `/weather-stories/${story.slug}` },
  };
}

export default async function WeatherStoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = weatherStory(slug);
  if (!story) notFound();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://thefamilyweather.com").replace(/\/+$/, "");
  const pageUrl = `${siteUrl}/weather-stories/${story.slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: story.title,
    description: story.description,
    datePublished: story.published,
    dateModified: story.published,
    mainEntityOfPage: pageUrl,
    author: { "@type": "Organization", name: "Family Weather", url: siteUrl },
    publisher: { "@type": "Organization", name: "Family Weather", url: siteUrl },
  };

  return (
    <div className="destinationPage eventPlanningPage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <header className="destinationHeader">
        <Link className="destinationBrand" href="/" aria-label="Family Weather home"><span className="brandMark" aria-hidden="true"><i /><i /><i /></span><span><strong>Family Weather</strong><small>Plan around what matters.</small></span></Link>
        <nav aria-label="Weather story navigation"><Link href="/weather-stories">All stories</Link><Link href="/event-weather-planning">Event guides</Link><Link className="destinationHome" href="/">Home</Link></nav>
      </header>
      <main>
        <section className="destinationHero eventPlanningHero">
          <div><p className="destinationKicker">{story.kicker}</p><h1>{story.title}</h1><p>{story.description}</p></div>
          <aside className="destinationCoordinates eventPlanningFocus"><small>WEATHER STORY</small><strong>{story.readTime}</strong><span>Published by Family Weather</span></aside>
        </section>

        <article>
          {story.sections.map((section) => (
            <section className="eventGuideIntro" key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>
          ))}
        </article>

        {story.sources?.length ? (
          <section className="eventPlanningGuide" aria-label="Sources">
            <article><p className="destinationKicker">Sources</p><h2>The weather facts behind the story.</h2><ul>{story.sources.map((source) => <li key={source.url}><a href={source.url} rel="noreferrer">{source.label}</a></li>)}</ul></article>
            <article><p className="destinationKicker">About these stories</p><h2>Weather is part of the event, not the sales pitch.</h2><p>Family Weather compares an activity, location and date using a live forecast when available or five years of same-date history when the event is farther away.</p></article>
          </section>
        ) : (
          <section className="eventGuideIntro"><p className="destinationKicker">About these stories</p><h2>Weather is part of the event, not the sales pitch.</h2><p>Family Weather compares an activity, location and date using a live forecast when available or five years of same-date history when the event is farther away.</p></section>
        )}
      </main>
      <footer className="destinationFooter"><strong>Family Weather</strong><span>Weather information for the plans people actually make.</span><Link href="/weather-stories">Weather stories</Link><Link href="/event-weather-planning">Event guides</Link><Link href="/weather-planning">Destinations</Link></footer>
    </div>
  );
}
