"use client";


import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import LocationSearchInput from "../components/LocationSearchInput";
import type { LocationCandidate } from "../lib/location";

import { clockLabel } from "../lib/rainTiming";
import type { RainTiming } from "../lib/rainTiming";
import type { RainSummary } from "../lib/rainSummary";
import DecisionEyeMark from "../components/DecisionEyeMark";
import { handedOffLocation } from "../lib/todayHandoff";
import { recommendedStartTime } from "../lib/plannerWindow";

type Advice = { tone: string; title: string; copy: string };
type Result = { rainTiming?: RainTiming | null; rainSummary?: RainSummary | null; source: string; location: string; resolvedLocation: LocationCandidate; day: { rainPeriodStart?: string; rainPeriodEnd?: string; date: string; temp_max_f: number; temp_min_f: number; precip_prob_pct: number | null; wind_max_mph: number; shortForecast?: string }; almanac?: { summary: string; rainYears: number; years: unknown[] } | null; space: string; activity: string; score: number | null; bestWindow: string; summary: string; advice: Advice[]; decision?: { status?: "recommended" | "caution" | "avoid" | "insufficient-data" | "historical-only"; bestWindow?: { start: string; end: string; label: string } | null; safety?: { kind: "rain-risk" | "thunderstorm" | "insufficient"; title: string; detail: string } } };

export default function PlannerTool({ initialActivity, initialLocation, initialDate, initialLat = "", initialLon = "" }: { initialActivity: string; initialLocation: string; initialDate: string; initialLat?: string; initialLon?: string }) {
  const [activity, setActivity] = useState(initialActivity || "yard work");
  const [location, setLocation] = useState(initialLocation);
  const [date, setDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [space, setSpace] = useState("outdoor");
  const [resolved, setResolved] = useState<LocationCandidate | null>(() => handedOffLocation(initialLocation, initialLat, initialLon));
  const [suggestions, setSuggestions] = useState<LocationCandidate[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const rainStrip = useRef<HTMLDivElement>(null);
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

  const recommendedTime = recommendedStartTime(result?.decision?.bestWindow?.start, result?.bestWindow);
  const createHref = `/create-event?activity=${encodeURIComponent(activity)}&location=${encodeURIComponent(location)}&date=${encodeURIComponent(date)}&window=${encodeURIComponent(result?.bestWindow || "")}&time=${encodeURIComponent(recommendedTime)}`;
  const dataIncomplete = result?.decision?.status === "insufficient-data" || result?.decision?.safety?.kind === "insufficient";
  const unsafeWeather = Boolean(result?.decision?.safety && result.decision.safety.kind !== "insufficient");
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
          <div className="resultHeading"><div><p className="publicKicker">{dataIncomplete ? "Weather data status" : result.almanac ? "Five-year historical pattern" : result.source === "nws" ? "Official NWS forecast" : result.source === "met-norway" ? "Worldwide forecast · MET Norway" : "Worldwide forecast"}</p><h2>{result.activity} in {result.location}</h2><p>{new Date(`${result.day.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p></div><div className={`scoreDial${unsafeWeather ? " unsafeWeather" : dataIncomplete ? " dataIncomplete" : ""}`}><strong>{unsafeWeather ? "!" : dataIncomplete ? "?" : result.score ?? "—"}</strong><span>{unsafeWeather ? "CHOOSE ANOTHER DAY" : dataIncomplete ? "DATA INCOMPLETE" : result.score === null ? "NOT SCORED" : result.almanac ? "HISTORICAL FIT" : "WEATHER FIT"}</span></div></div>
          {unsafeWeather && result.decision?.safety ? <div className="plannerSafetyAlert" role="alert"><strong>{result.decision.safety.title}</strong><p>{result.decision.safety.detail}</p></div> : dataIncomplete ? <div className="plannerDataAlert" role="status"><strong>Weather data is incomplete—not bad.</strong><p>Family Weather could not verify enough hourly detail to issue a weather verdict. This is not a recommendation to cancel.</p></div> : null}
          <div className="resultFacts"><article><small>BEST WINDOW</small><strong>{result.bestWindow}</strong></article><article><small>HIGH / LOW (°F)</small><strong>{result.day.temp_max_f}°F / {result.day.temp_min_f}°F</strong></article><article><small>{result.almanac ? "RAIN IN PAST YEARS" : result.rainSummary?.peakHourlyProbabilityPct != null ? "PEAK HOURLY RAIN" : result.source === "nws" ? "DAYTIME RAIN CHANCE" : result.source === "open-meteo" ? "PEAK HOURLY RAIN" : "DAY RAIN CHANCE"}</small><strong>{result.almanac ? `${result.almanac.rainYears} of ${result.almanac.years.length} years` : result.rainSummary?.peakHourlyProbabilityPct != null ? `${result.rainSummary.peakHourlyProbabilityPct}%` : result.day.precip_prob_pct === null ? "Unavailable" : `${result.day.precip_prob_pct}%`}</strong></article><article><small>WIND</small><strong>{result.day.wind_max_mph} mph</strong></article></div>
          {result.rainSummary ? <p className="resultRainNote">{result.rainSummary.peakHourlyProbabilityPct != null ? "Peak hourly rain is the highest available hourly chance for this date, not the chance of rain over the whole day. " : "Hourly rain probabilities are unavailable. "}<a href="https://www.weatherapi.com/">WeatherAPI</a> reports a separate daily estimate of {result.rainSummary.dayProbabilityPct === null ? "unavailable" : `${result.rainSummary.dayProbabilityPct}%`}. The advice below evaluates the activity’s time window and applicable safety checks.</p> : null}
          {result.source === "nws" && result.day.rainPeriodStart && result.day.rainPeriodEnd ? <p className="resultRainNote">NWS daytime rain chance covers {clockLabel(result.day.rainPeriodStart)}–{clockLabel(result.day.rainPeriodEnd)}. It is separate from each hour’s chance and does not include tonight.</p> : null}
          {result.rainTiming ? <section className="rainTiming" aria-label="Rain timing">
            <div className="rainTimingHeading"><h3>Rain timing &amp; time to pack up</h3><div className="rainTimingControls" aria-label="Move through hourly forecast"><button type="button" aria-label="Show earlier hours" onClick={() => rainStrip.current?.scrollBy({ left: -260, behavior: "smooth" })}>←</button><button type="button" aria-label="Show later hours" onClick={() => rainStrip.current?.scrollBy({ left: 260, behavior: "smooth" })}>→</button></div></div>
            <p>{result.rainTiming.peak === null ? "Rain probabilities are unavailable for these hours." : `Highest available rain chance: ${result.rainTiming.peak}% at ${result.rainTiming.peakLabels.join(", ")}.`}</p>
            <p className="rainTimingHint">Swipe or use the arrows to see every hour.</p>
            <div ref={rainStrip} className="rainTimingStrip" tabIndex={0} aria-label="Forecast rain probabilities by local time">
              {result.rainTiming.rows.map(row => <div key={row.time} className={row.inWindow ? "rainHour inWindow" : "rainHour"}><strong>{row.label}</strong><div>{row.probability === null ? "—" : `${row.probability}%`}</div><small>{row.thunder ? "⚡ Thunder risk" : row.intervalHours > 1 ? `${row.intervalHours}-hour period` : row.inWindow ? "Your window" : "1-hour period"}</small></div>)}
            </div>
            {result.rainTiming.cleanup.length ? <p><strong>After your window: </strong>{result.rainTiming.cleanup.map(row => `${row.label}: ${row.probability === null ? "rain chance unavailable" : `${row.probability}%`}${row.thunder ? " — thunder risk" : ""}`).join("; ")}. Leave time to bring equipment inside and get home.</p> : <p>Extra time after your window has not been established from this forecast.</p>}
            <small>Times are local to the destination. Only available forecast periods are shown; missing data is not zero risk. These are forecast chances, not an exact rain arrival time or a guaranteed dry buffer.</small>
          </section> : null}
          <p className="resultSummary">{result.summary}</p>
          <div className="adviceList">{result.advice?.map((item) => <article key={item.title} className={`${item.tone === "warn" ? "warning" : ""}${item.title === "The Eye says" ? " eyeGuidance" : ""}`}><span>{item.title === "The Eye says" ? <DecisionEyeMark /> : item.tone === "warn" ? "!" : "✓"}</span><div><strong>{item.title}</strong><p>{item.copy}</p></div></article>)}</div>
          <div className="publicActionRow">{unsafeWeather ? <button className="publicPrimary asButton" type="button" onClick={() => { setResult(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Choose another date <span>→</span></button> : <a className="publicPrimary" href={createHref}>{dataIncomplete ? "Create event without a weather verdict" : "Create an event from this plan"} <span>→</span></a>}<button className="publicSecondary asButton" type="button" onClick={() => { setResult(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{dataIncomplete ? "Try the weather check again" : "Check another plan"}</button></div>
        </>}
      </div>
    </section>
  );
}
