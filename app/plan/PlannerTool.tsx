"use client";


import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import LocationSearchInput from "../components/LocationSearchInput";
import type { LocationCandidate } from "../lib/location";

import { clockLabel } from "../lib/rainTiming";
import type { RainTiming } from "../lib/rainTiming";
import type { RainSummary } from "../lib/rainSummary";

type Advice = { tone: string; title: string; copy: string };
type Result = { rainTiming?: RainTiming | null; rainSummary?: RainSummary | null; source: string; location: string; resolvedLocation: LocationCandidate; day: { rainPeriodStart?: string; rainPeriodEnd?: string; date: string; temp_max_f: number; temp_min_f: number; precip_prob_pct: number | null; wind_max_mph: number; shortForecast?: string }; almanac?: { summary: string; rainYears: number; years: unknown[] } | null; space: string; activity: string; score: number | null; bestWindow: string; summary: string; advice: Advice[]; decision?: { safety?: { kind: "clear" | "rain-risk" | "thunderstorm" | "insufficient"; title: string; detail: string } } };

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
          <div className="resultHeading"><div><p className="publicKicker">{result.almanac ? "Five-year historical pattern" : result.source === "nws" ? "Official NWS forecast" : result.source === "met-norway" ? "Worldwide forecast · MET Norway" : "Worldwide forecast"}</p><h2>{result.activity} in {result.location}</h2><p>{new Date(`${result.day.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p></div><div className="scoreDial" style={result.decision?.safety ? { background: "#a51d25", borderColor: "#a51d25", color: "#fff" } : undefined}><strong>{result.decision?.safety ? "!" : result.score ?? "—"}</strong><span>{result.decision?.safety ? "CHOOSE ANOTHER DAY" : result.score === null ? "NOT SCORED" : "WEATHER FIT"}</span></div></div>
          {result.decision?.safety ? <div className="plannerSafetyAlert" role="alert" style={{ background: "#fff1f0", border: "2px solid #a51d25", color: "#78151b", padding: "1rem", borderRadius: "0.75rem", marginBottom: "1rem" }}><strong>{result.decision.safety.title}</strong><p>{result.decision.safety.detail}</p></div> : null}
          <div className="resultFacts"><article><small>BEST WINDOW</small><strong>{result.bestWindow}</strong></article><article><small>HIGH / LOW</small><strong>{result.day.temp_max_f}° / {result.day.temp_min_f}°</strong></article><article><small>{result.almanac ? "RAIN IN PAST YEARS" : result.rainSummary?.peakHourlyProbabilityPct != null ? "PEAK HOURLY RAIN" : result.source === "nws" ? "DAYTIME RAIN CHANCE" : result.source === "open-meteo" ? "PEAK HOURLY RAIN" : "DAY RAIN CHANCE"}</small><strong>{result.almanac ? `${result.almanac.rainYears} of ${result.almanac.years.length} years` : result.rainSummary?.peakHourlyProbabilityPct != null ? `${result.rainSummary.peakHourlyProbabilityPct}%` : result.day.precip_prob_pct === null ? "Unavailable" : `${result.day.precip_prob_pct}%`}</strong></article><article><small>WIND</small><strong>{result.day.wind_max_mph} mph</strong></article></div>
          {result.rainSummary ? <p className="resultRainNote">{result.rainSummary.peakHourlyProbabilityPct != null ? "Peak hourly rain is the highest available hourly chance for this date, not the chance of rain over the whole day. " : "Hourly rain probabilities are unavailable. "}<a href="https://www.weatherapi.com/">WeatherAPI</a> reports a separate daily estimate of {result.rainSummary.dayProbabilityPct === null ? "unavailable" : `${result.rainSummary.dayProbabilityPct}%`}. The advice below evaluates the activity’s time window and applicable safety checks.</p> : null}
          {result.source === "nws" && result.day.rainPeriodStart && result.day.rainPeriodEnd ? <p className="resultRainNote">NWS daytime rain chance covers {clockLabel(result.day.rainPeriodStart)}–{clockLabel(result.day.rainPeriodEnd)}. It is separate from each hour’s chance and does not include tonight.</p> : null}
          {result.rainTiming ? <section aria-label="Rain timing" style={{ margin: "1rem 0", padding: "1rem", border: "1px solid #b5c9c1", borderRadius: "12px", background: "#f3f8f5", color: "#183d32" }}>
            <h3 style={{ marginTop: 0 }}>Rain timing &amp; time to pack up</h3>
            <p>{result.rainTiming.peak === null ? "Rain probabilities are unavailable for these hours." : `Highest available rain chance: ${result.rainTiming.peak}% at ${result.rainTiming.peakLabels.join(", ")}.`}</p>
            <div style={{ display: "flex", overflowX: "auto", gap: "8px", paddingBottom: "10px" }} tabIndex={0} aria-label="Forecast rain probabilities by local time">
              {result.rainTiming.rows.map(row => <div key={row.time} style={{ flex: "0 0 76px", padding: "10px 5px", textAlign: "center", borderRadius: "8px", background: row.inWindow ? "#184c3c" : "#fff", color: row.inWindow ? "#fff" : "#183d32", border: "1px solid #b5c9c1" }}><strong>{row.label}</strong><div style={{ fontSize: "20px", margin: "6px 0" }}>{row.probability === null ? "—" : `${row.probability}%`}</div><small>{row.thunder ? "⚡ Thunder risk" : row.intervalHours > 1 ? `${row.intervalHours}-hour period` : row.inWindow ? "Your window" : "1-hour period"}</small></div>)}
            </div>
            {result.rainTiming.cleanup.length ? <p><strong>After your window: </strong>{result.rainTiming.cleanup.map(row => `${row.label}: ${row.probability === null ? "rain chance unavailable" : `${row.probability}%`}${row.thunder ? " — thunder risk" : ""}`).join("; ")}. Leave time to bring equipment inside and get home.</p> : <p>Extra time after your window has not been established from this forecast.</p>}
            <small>Times are local to the destination. Only available forecast periods are shown; missing data is not zero risk. These are forecast chances, not an exact rain arrival time or a guaranteed dry buffer.</small>
          </section> : null}
          <p className="resultSummary">{result.summary}</p>
          <div className="adviceList">{result.advice?.map((item) => <article key={item.title} className={item.tone === "warn" ? "warning" : ""}><span>{item.tone === "warn" ? "!" : "✓"}</span><div><strong>{item.title}</strong><p>{item.copy}</p></div></article>)}</div>
          <div className="publicActionRow">{result.decision?.safety ? <button className="publicPrimary asButton" type="button" onClick={() => { setResult(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Choose another date <span>→</span></button> : <a className="publicPrimary" href={createHref}>Create an event from this plan <span>→</span></a>}<button className="publicSecondary asButton" type="button" onClick={() => { setResult(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Check another plan</button></div>
        </>}
      </div>
    </section>
  );
}
