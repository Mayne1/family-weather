"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import LocationSearchInput from "../components/LocationSearchInput";
import type { LocationCandidate } from "../lib/location";

type Almanac = { location: string; averageHighF: number; averageLowF: number; averageWindMph: number; rainYears: number; rainFrequencyPct: number; summary: string; years: Array<{ year: number; date: string; condition: string; high_f: number; low_f: number; rain: boolean; precipitation_in: number }> };

export default function WeatherHistoryTool() {
  const [location, setLocation] = useState("");
  const [resolved, setResolved] = useState<LocationCandidate | null>(null);
  const [suggestions, setSuggestions] = useState<LocationCandidate[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState<Almanac | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/weather/almanac", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location, resolvedLocation: resolved, date }) });
      const data = await response.json();
      if (!response.ok || !data.ok) { if (response.status === 409) setSuggestions(data.suggestions || []); throw new Error(data.error || "Weather history could not be loaded."); }
      setResolved(data.resolvedLocation); setLocation(data.resolvedLocation?.label || location); setSuggestions([]); setResult(data.almanac);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Weather history could not be loaded."); }
    finally { setLoading(false); }
  }

  return <section className="historyWorkspace">
    <form className="historyForm" onSubmit={submit}><label className="formField"><span>Location</span><LocationSearchInput id="history-location" required value={location} forcedSuggestions={suggestions} onChange={(value) => { setLocation(value); setResolved(null); setSuggestions([]); }} onSelect={(candidate) => { setLocation(candidate.label); setResolved(candidate); setSuggestions([]); }} placeholder="Address, city, landmark, venue, or destination" /></label><label className="formField"><span>Date to compare</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label><button className="primaryCta" disabled={loading}>{loading ? "Looking through history…" : "Compare five years"}<span>→</span></button>{error ? <p className="formError" role="alert">{error}</p> : null}</form>
    <div className={`historyResult ${result ? "hasResult" : ""}`} aria-live="polite">{!result ? <div className="resultWelcome"><p className="publicKicker">Worldwide same-date history</p><h2>A calendar with a memory.</h2><p>Choose a location and date to see recorded highs, lows, conditions, rainfall, and the overall pattern from the five previous years.</p><p className="historyNotice"><strong>Historical pattern only—not a forecast.</strong></p></div> : <><p className="publicKicker">{result.location}</p><h2>{new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric" })} across five years</h2><div className="historySummary"><article><small>AVG HIGH</small><strong>{result.averageHighF}°</strong></article><article><small>AVG LOW</small><strong>{result.averageLowF}°</strong></article><article><small>RAIN YEARS</small><strong>{result.rainYears}/5</strong></article><article><small>AVG WIND</small><strong>{result.averageWindMph} mph</strong></article></div><p className="resultSummary">{result.summary}</p><p className="historyNotice"><strong>Historical pattern only—not a forecast.</strong></p><div className="historyYears">{result.years.map((year) => <article key={year.date}><span>{year.year}</span><h3>{year.condition}</h3><strong>{year.high_f}° / {year.low_f}°</strong><p>{year.rain ? `${year.precipitation_in.toFixed(2)} inches of rain` : "No rain recorded"}</p></article>)}</div><div className="publicActionRow"><Link className="publicPrimary" href={`/plan?location=${encodeURIComponent(location)}&date=${encodeURIComponent(date)}`}>Check a complete plan <span>→</span></Link></div></>}</div>
  </section>;
}
