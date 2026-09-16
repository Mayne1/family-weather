import type { Metadata } from "next";
import PublicChrome from "../components/PublicChrome";
import TodayWeather from "./TodayWeather";

export const metadata: Metadata = {
  title: "Today’s Weather for Real-Life Plans | Family Weather",
  description: "Check current conditions, the next several days, and what temperature, rain, and wind mean for the things you want to do.",
  alternates: { canonical: "/today" },
};

export default function TodayPage() {
  return (
    <PublicChrome>
      <main className="publicMain">
        <section className="publicHero compactHero">
          <p className="publicKicker">Today and the next few days</p>
          <h1>The weather is data.<br /><em>Your plan is the decision.</em></h1>
          <p>Keep this page open for a quick look at current conditions, or take the next step and check how the weather fits yard work, a cookout, a walk, a game, or whatever you actually intend to do.</p>
        </section>
        <TodayWeather />
        <section className="publicReadingGrid">
          <article><span>01</span><h2>Temperature is only the beginning.</h2><p>A comfortable number can still come with disruptive wind, rain, poor visibility, or a sharp change later in the day.</p></article>
          <article><span>02</span><h2>The best hour depends on the activity.</h2><p>Yard work, grilling, traveling, and an outdoor gathering do not have the same weather needs. Use the planner when the decision matters.</p></article>
          <article><span>03</span><h2>Future dates need context.</h2><p>When a date is beyond the live forecast, Family Weather can compare that calendar date across five previous years.</p></article>
        </section>
      </main>
    </PublicChrome>
  );
}
