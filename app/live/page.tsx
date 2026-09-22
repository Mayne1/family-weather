import type { Metadata } from "next";
import Link from "next/link";
import PublicChrome from "../components/PublicChrome";
import TodayWeather from "../today/TodayWeather";

export const metadata: Metadata = { title: "Live Weather Desk | Family Weather", description: "Current conditions, the next several days, and direct paths from the weather report to a real activity decision.", alternates: { canonical: "/live" } };

export default function LivePage(){
 return <PublicChrome><main className="publicMain"><section className="publicHero"><p className="publicKicker">Family Weather Live</p><h1>What is happening now.<br/><em>What should you check next?</em></h1><p>Current conditions and the next several days are the beginning of the answer. Apply a day to an actual activity when you need a useful time window.</p></section><TodayWeather/><section className="aboutStory"><div><p className="publicKicker">Live does not mean limitless</p><h2>Use official alerts for dangerous weather.</h2><p>This desk shows the latest weather data available to Family Weather. It is not a replacement for Wireless Emergency Alerts, National Weather Service warnings, evacuation orders, road closures, park notices, or instructions from local authorities.</p></div><aside><strong>Planning something exposed?</strong><p>Check upstream conditions, terrain, access roads, venue or park notices, and official alerts—not only the pin where you plan to stand.</p><a href="https://www.weather.gov/" rel="noreferrer">Open the National Weather Service ↗</a></aside></section><section className="publicClosing"><h2>Make the weather answer your question.</h2><div className="publicActionRow"><Link className="publicPrimary" href="/plan">Apply weather to an activity <span>→</span></Link><Link className="publicSecondary" href="/weather-history">Research a later date</Link></div></section></main></PublicChrome>;
}
