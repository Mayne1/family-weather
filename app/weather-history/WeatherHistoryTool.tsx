"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import LocationSearchInput from "../components/LocationSearchInput";
import WeatherIcon from "../components/WeatherIcon";
import type { LocationCandidate } from "../lib/location";

type Almanac = { location: string; averageHighF: number; averageLowF: number; averageWindMph: number; rainYears: number; rainFrequencyPct: number; typicalWeatherCode: number; summary: string; years: Array<{ year: number; date: string; condition: string; high_f: number; low_f: number; rain: boolean; precipitation_in: number; weather_code: number }> };

export default function WeatherHistoryTool({ initialLocation = "", initialDate = "" }: { initialLocation?: string; initialDate?: string }) {
  const [location, setLocation] = useState(initialLocation);
  const [resolved, setResolved] = useState<LocationCandidate | null>(null);
  const [suggestions, setSuggestions] = useState<LocationCandidate[]>([]);
  const [date, setDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState<Almanac | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const autoChecked = useRef(false);

  async function checkHistory() {
    setLoading(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/weather/almanac", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location, resolvedLocation: resolved, date }) });
      const data = await response.json();
      if (!response.ok || !data.ok) { if (response.status === 409) setSuggestions(data.suggestions || []); throw new Error(data.error || "Weather history could not be loaded."); }
      setResolved(data.resolvedLocation); setLocation(data.resolvedLocation?.label || location); setSuggestions([]); setResult(data.almanac);
      window.history.replaceState(null, "", `/weather-history?location=${encodeURIComponent(data.resolvedLocation?.label || location)}&date=${encodeURIComponent(date)}`);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Weather history could not be loaded.";
      setError(/abort|timeout/i.test(message) ? "The history service took too long to answer. Nothing is wrong with your date—try the lookup again." : message);
    } finally { setLoading(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void checkHistory();
  }

  useEffect(() => {
    if (!initialLocation || !initialDate || autoChecked.current) return;
    autoChecked.current = true;
    void checkHistory();
  // Run once when the homepage hands a complete lookup to this page.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <section className="historyWorkspace">
    <form className="historyForm" onSubmit={submit}>
      <div className="toolNumber">01 <span>Choose the place and calendar date</span></div>
      <label className="formField"><span>Location</span><LocationSearchInput id="history-location" required value={location} forcedSuggestions={suggestions} onChange={(value) => { setLocation(value); setResolved(null); setSuggestions([]); }} onSelect={(candidate) => { setLocation(candidate.label); setResolved(candidate); setSuggestions([]); }} placeholder="Address, city, landmark, venue, or destination" /></label>
      <label className="formField"><span>Date to compare</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
      <button className="primaryCta" disabled={loading}>{loading ? "Looking through five years…" : "Compare five years"}<span>→</span></button>
      <p className="toolFinePrint">We compare this month and day across the five previous available years. The year you choose sets the five-year range.</p>
      {error ? <div className="historyError" role="alert"><strong>That lookup did not finish.</strong><p>{error}</p><button type="button" onClick={() => void checkHistory()} disabled={loading}>Try again</button></div> : null}
    </form>
    <div className={`historyResult ${result ? "hasResult" : ""}`} aria-live="polite">
      {!result ? <div className="resultWelcome"><p className="publicKicker">02 · Read the pattern</p><h2>A calendar with a memory.</h2><p>The result does more than list five temperatures. It shows the range, how often rain appeared, typical peak wind, and each year side by side so one unusual year cannot quietly pretend to be the whole story.</p><div className="historyQuestionGrid"><span><strong>Was rain common?</strong><small>Count the matching years.</small></span><span><strong>How wide was the range?</strong><small>Compare highs and lows.</small></span><span><strong>Was wind part of the pattern?</strong><small>Check the average peak.</small></span></div><p className="historyNotice"><strong>Historical pattern only—not a forecast.</strong></p></div> : <>
        <div className="historyResultHeading"><div><p className="publicKicker">{result.location}</p><h2>{new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric" })} across five years</h2></div><WeatherIcon code={result.typicalWeatherCode} title="Typical condition across the matching dates" /></div>
        <div className="historySummary"><article><small>AVG HIGH</small><strong>{result.averageHighF}°</strong></article><article><small>AVG LOW</small><strong>{result.averageLowF}°</strong></article><article><small>RAIN YEARS</small><strong>{result.rainYears}/{result.years.length}</strong></article><article><small>AVG WIND</small><strong>{result.averageWindMph} mph</strong></article></div>
        <p className="resultSummary">{result.summary} The five cards below show the actual matching dates used in that summary.</p><p className="historyNotice"><strong>Historical pattern only—not a forecast.</strong></p>
        <div className="historyYears">{result.years.map((year) => <article key={year.date}><div><span>{year.year}</span><WeatherIcon code={year.weather_code} /></div><h3>{year.condition}</h3><strong>{year.high_f}° / {year.low_f}°</strong><p>{year.rain ? `${year.precipitation_in.toFixed(2)} inches of rain` : "No rain recorded"}</p></article>)}</div>
        <div className="historyNext"><h3>Now apply the pattern to an actual plan.</h3><p>Weather history gives context. The activity planner adds the thing you are doing, whether it is indoors or outdoors, and a weather-fit explanation.</p><div className="publicActionRow"><Link className="publicPrimary" href={`/plan?location=${encodeURIComponent(location)}&date=${encodeURIComponent(date)}`}>Check a complete plan <span>→</span></Link></div></div>
      </>}
    </div>
  </section>;
}
