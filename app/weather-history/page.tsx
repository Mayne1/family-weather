import type { Metadata } from "next";
import PublicChrome from "../components/PublicChrome";
import WeatherHistoryTool from "./WeatherHistoryTool";

export const metadata: Metadata = {
  title: "Five-Year Weather History Lookup | Family Weather",
  description: "Compare the same calendar date across five previous years for a city, address, landmark, venue, or destination.",
  alternates: { canonical: "/weather-history" },
};

export default async function WeatherHistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const initialLocation = typeof query.location === "string" ? query.location : "";
  const initialDate = typeof query.date === "string" ? query.date : "";
  return <PublicChrome><main className="publicMain">
    <section className="publicHero compactHero"><p className="publicKicker">Five-year weather history</p><h1>What has this date<br /><em>done before?</em></h1><p>For dates beyond the live forecast, history can provide context. Search the real place and date; Family Weather compares that calendar day across five previous years.</p></section>
    <WeatherHistoryTool initialLocation={initialLocation} initialDate={initialDate} />
    <section className="historyLimits"><div><p className="publicKicker">Use it for context</p><h2>History shows a pattern. It does not issue a promise.</h2></div><div><p>A five-year comparison can reveal whether rain, heat, cold, or wind has commonly appeared near a date. It cannot guarantee the next occurrence.</p><p>Use it early, when a live forecast does not reach the date yet. When the day enters the forecast window, return to the activity planner for current conditions and a more useful time window.</p></div></section>
    <section className="historyMethod"><div><p className="publicKicker">What the comparison answers</p><h2>Enough detail to recognize a pattern—without pretending history is destiny.</h2></div><div className="historyMethodGrid"><article><strong>Seasonal context</strong><p>See whether this calendar date repeatedly landed in heat, cold, rain, fog, or calmer weather.</p></article><article><strong>Year-to-year spread</strong><p>One average can hide a lot. The individual years show whether conditions were consistent or scattered.</p></article><article><strong>A reason to check again</strong><p>The result gives you an early planning clue, then points you back to live forecasting when the event gets close enough.</p></article></div></section>
  </main></PublicChrome>;
}
