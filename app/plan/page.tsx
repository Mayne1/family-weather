import type { Metadata } from "next";
import PublicChrome from "../components/PublicChrome";
import PlannerTool from "./PlannerTool";

export const metadata: Metadata = {
  title: "Activity Weather Planner | Family Weather",
  description: "Tell Family Weather what you want to do, where, and when. Get a weather-fit score, best time window, conditions, and practical planning context.",
  alternates: { canonical: "/plan" },
};

export default async function PlanPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const initial = (key: string) => typeof query[key] === "string" ? query[key] as string : "";
  return (
    <PublicChrome>
      <main className="publicMain">
        <section className="publicHero compactHero">
          <p className="publicKicker">Activity weather planner</p>
          <h1>What are you doing?<br /><em>When should you do it?</em></h1>
          <p>A forecast reports conditions. Family Weather applies those conditions to the activity, location, setting, and date you choose.</p>
        </section>
        <PlannerTool initialActivity={initial("activity")} initialLocation={initial("location")} initialDate={initial("date")} />
        <section className="plannerExplanation">
          <div><p className="publicKicker">What the answer means</p><h2>A recommendation, not a guarantee.</h2></div>
          <p>Dates inside the forecast window use available forecast data. Farther-out dates use five years of same-date history as planning context. Conditions can change, so check again as the day approaches.</p>
        </section>
      </main>
    </PublicChrome>
  );
}
