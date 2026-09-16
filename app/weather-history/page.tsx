import type { Metadata } from "next";
import PublicChrome from "../components/PublicChrome";
import WeatherHistoryTool from "./WeatherHistoryTool";

export const metadata: Metadata = {
  title: "Five-Year Weather History Lookup | Family Weather",
  description: "Compare the same calendar date across five previous years for a city, address, landmark, venue, or destination.",
  alternates: { canonical: "/weather-history" },
};

export default function WeatherHistoryPage() {
  return <PublicChrome><main className="publicMain">
    <section className="publicHero compactHero"><p className="publicKicker">Five-year weather history</p><h1>What has this date<br /><em>done before?</em></h1><p>For dates beyond the live forecast, history can provide context. Search the real place and date; Family Weather compares that calendar day across five previous years.</p></section>
    <WeatherHistoryTool />
    <section className="historyLimits"><div><p className="publicKicker">Use it for context</p><h2>History shows a pattern. It does not issue a promise.</h2></div><div><p>A five-year comparison can reveal whether rain, heat, cold, or wind has commonly appeared near a date. It cannot guarantee the next occurrence.</p><p>As the event enters the live forecast window, check the activity planner again for current guidance.</p></div></section>
  </main></PublicChrome>;
}
