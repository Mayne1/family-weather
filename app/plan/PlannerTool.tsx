"use client";


import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import LocationSearchInput from "../components/LocationSearchInput";
import type { LocationCandidate } from "../lib/location";

type Advice = { tone: string; title: string; copy: string };
type Result = { source: string; location: string; resolvedLocation: LocationCandidate; day: { date: string; temp_max_f: number; temp_min_f: number; precip_prob_pct: number; wind_max_mph: number; shortForecast?: string }; almanac?: { summary: string } | null; space: string; activity: string; score: number; bestWindow: string; summary: string; advice: Advice[] };

export default function PlannerTool({ initialActivity, initialLocation, initialDate }: { initialActivity: string; initialLocation: string; initialDate: string }) {
  const [activity, setActivity] = useState(initialActivity || "yard work");
  const [location, setLocation] = useState(initialLocation);
  const [date, setDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [space, setSpace] = useState("outdoor");
  const [resolved, setResolved] = useState<LocationCandidate | null>(null);
  const [suggestions, setSuggestions] = useState<LocationCandidate[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const autoChecked = useRef(false);

  async function checkPlan(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/weather/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activity, location, resolvedLocation: resolved, date, space }) });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        if (response.status === 409) setSuggestions(data.suggestions || []);
        throw new Error(data.error || "The weather plan could not be checked.");
      }
      setResolved(data.resolvedLocation); setLocation(data.resolvedLocation?.label || location); setSuggestions([]); setResult(data);
      window.history.replaceState(null, "", `/plan?activity=${encodeURIComponent(activity)}&location=${encodeURIComponent(data.resolvedLocation?.label || location)}&date=${encodeURIComponent(date)}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The weather plan could not be checked."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!initialActivity || !initialLocation || !initialDate || autoChecked.current) return;
    autoChecked.current = true;
    void checkPlan();
  // Run once for a complete plan handed off by the homepage.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createHref = `/create-event?activity=${encodeURIComponent(activity)}&location=${encodeURIComponent(location)}&date=${encodeURIComponent(date)}&window=${encodeURIComponent(result?.bestWindow || "")}`;
  return (
    <section className="plannerWorkspace">
      <form className="standalonePlanner" onSubmit={checkPlan}>
        <div className="formGrid">
          <label className="formField"><span>What are you doing?</span><input value={activity} onChange={(event) => setActivity(event.target.value)} required maxLength={80} placeholder="Yard work, cookout, outdoor wedding…" /></label>
          <label className="formField"><span>Date</span><input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} required /></label>
          <label className="formField full"><span>Where?</span><LocationSearchInput id="plan-location" required value={location} forcedSuggestions={suggestions} onChange={(value) => { setLocation(value); setResolved(null); setSuggestions([]); }} onSelect={(candidate) => { setLocation(candidate.label); setResolved(candidate); setSuggestions([]); }} placeholder="Address, city, landmark, venue, or destination" /></label>
        </div>
        <fieldset className="spaceChoice"><legend>Where will you spend the time?</legend><div>{[["indoor", "⌂", "Indoor", "Travel weather still matters."], ["outdoor", "☀", "Outdoor", "Comfort and exposure matter."], ["both", "◐", "Both", "Check inside and outside." ]].map(([value, icon, title, copy]) => <button key={value} type="button" className={space === value ? "active" : ""} onClick={() => setSpace(value)}><b>{icon}</b><span><strong>{title}</strong><small>{copy}</small></span></button>)}</div></fieldset>
        <button className="primaryCta" disabled={loading}>{loading ? "Checking the weather…" : "Check this plan"}<span>→</span></button>
        {error ? <p className="formError" role="alert">{error}</p> : null}
      </form>
      <div className={`plannerResultPage ${result ? "hasResult" : ""}`} aria-live="polite">
        {!result ? <div className="resultWelcome"><p className="publicKicker">Your answer will appear here</p><h2>Not just “72° and cloudy.”</h2><p>Family Weather evaluates the selected activity and setting, gives the day a weather-fit score, identifies a useful time window when possible, and explains the conditions that deserve attention.</p><div className="resultExample"><span>EXAMPLE</span><strong>Best window: 1–4 PM</strong><small>Comfortable temperature · wind increasing later</small></div></div> : <>
          <div className="resultHeading"><div><p className="publicKicker">{result.almanac ? "Five-year historical pattern" : result.source === "nws" ? "Official NWS forecast" : "Worldwide forecast"}</p><h2>{result.activity} in {result.location}</h2><p>{new Date(`${result.day.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p></div><div className="scoreDial"><strong>{result.score}</strong><span>WEATHER FIT</span></div></div>
          <div className="resultFacts"><article><small>BEST WINDOW</small><strong>{result.bestWindow}</strong></article><article><small>HIGH / LOW</small><strong>{result.day.temp_max_f}° / {result.day.temp_min_f}°</strong></article><article><small>RAIN</small><strong>{result.day.precip_prob_pct}%</strong></article><article><small>WIND</small><strong>{result.day.wind_max_mph} mph</strong></article></div>
          <p className="resultSummary">{result.summary}</p>
          <div className="adviceList">{result.advice?.map((item) => <article key={item.title} className={item.tone === "warn" ? "warning" : ""}><span>{item.tone === "warn" ? "!" : "✓"}</span><div><strong>{item.title}</strong><p>{item.copy}</p></div></article>)}</div>
          <div className="publicActionRow"><a className="publicPrimary" href={createHref}>Create an event from this plan <span>→</span></a><button className="publicSecondary asButton" type="button" onClick={() => { setResult(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Check another plan</button></div>
        </>}
      </div>
    </section>
  );
}
