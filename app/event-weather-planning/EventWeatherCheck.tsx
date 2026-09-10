"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import LocationSearchInput from "../components/LocationSearchInput";
import type { LocationCandidate } from "../lib/location";
import type { EventWeatherPlanningPage } from "./events";

type AlmanacYear = { year: number; high_f: number; low_f: number; condition: string };
type PlanResult = {
  source: string;
  location: string;
  resolvedLocation?: LocationCandidate;
  bestWindow?: string;
  score?: number;
  day: { date: string; temp_max_f: number; temp_min_f: number; precip_prob_pct: number; wind_max_mph: number; shortForecast?: string };
  almanac?: { summary: string; years: AlmanacYear[] } | null;
  advice?: { title: string; copy: string }[];
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

export default function EventWeatherCheck({ eventPage }: { eventPage: EventWeatherPlanningPage }) {
  const [location, setLocation] = useState("");
  const [resolvedLocation, setResolvedLocation] = useState<LocationCandidate | null>(null);
  const [forcedSuggestions, setForcedSuggestions] = useState<LocationCandidate[]>([]);
  const [date, setDate] = useState("");
  const [space, setSpace] = useState(eventPage.defaultSpace);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function checkWeather(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!location.trim() || !date) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/weather/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, resolvedLocation, date, activity: eventPage.activity, space }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        if (response.status === 409) setForcedSuggestions(data.suggestions || []);
        throw new Error(data.error || "Weather lookup failed");
      }
      setResolvedLocation(data.resolvedLocation || resolvedLocation);
      setLocation(data.resolvedLocation?.label || data.location || location);
      setForcedSuggestions([]);
      setResult(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Weather information is unavailable right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="destinationDateCheck eventDateCheck" aria-labelledby="event-weather-check-heading">
      <div>
        <p className="destinationKicker">Check your event date</p>
        <h2 id="event-weather-check-heading">What could the weather mean for your {eventPage.activity}?</h2>
        <p>Enter the location and date. Near dates use a live forecast; dates farther away use the same calendar date from the previous five years.</p>
      </div>
      <form className="eventWeatherForm" onSubmit={checkWeather}>
        <label>
          <span>EVENT LOCATION</span>
          <LocationSearchInput
            id="event-weather-location"
            value={location}
            required
            placeholder="Venue, address, city, park, or ZIP code"
            forcedSuggestions={forcedSuggestions}
            onChange={(value) => { setLocation(value); setResolvedLocation(null); setForcedSuggestions([]); }}
            onSelect={(candidate) => { setLocation(candidate.label); setResolvedLocation(candidate); setForcedSuggestions([]); }}
          />
        </label>
        <label>
          <span>EVENT DATE</span>
          <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(changeEvent) => setDate(changeEvent.target.value)} required />
        </label>
        <label>
          <span>EVENT SETTING</span>
          <select value={space} onChange={(changeEvent) => setSpace(changeEvent.target.value as typeof space)}>
            <option value="outdoor">Mostly outdoors</option>
            <option value="mixed">Indoor and outdoor</option>
            <option value="indoor">Mostly indoors</option>
          </select>
        </label>
        <button type="submit" disabled={loading || !date || !location.trim()}>
          <span>{loading ? "Checking weather…" : "Check this event"}</span><span aria-hidden="true">→</span>
        </button>
      </form>
      {error && <p className="destinationError" role="alert">{error}</p>}
      {result && (
        <div className="destinationWeatherResult" aria-live="polite">
          <div className="destinationResultHeading">
            <div><small>{result.source === "almanac" ? "FIVE-YEAR HISTORICAL PATTERN" : "LIVE FORECAST"}</small><h3>{dateLabel(result.day.date)}</h3><p>{result.location}</p></div>
            <strong>{result.day.temp_max_f}°<small>high</small></strong>
          </div>
          <div className="destinationWeatherFacts">
            <span><small>LOW</small><strong>{result.day.temp_min_f}°F</strong></span>
            <span><small>{result.source === "almanac" ? "RAIN FREQUENCY" : "RAIN CHANCE"}</small><strong>{result.day.precip_prob_pct}%</strong></span>
            <span><small>PEAK WIND</small><strong>{result.day.wind_max_mph} mph</strong></span>
          </div>
          {result.bestWindow && <p><strong>Best planning window:</strong> {result.bestWindow}</p>}
          <p>{result.day.shortForecast || result.almanac?.summary}</p>
          {result.advice?.length ? <div className="eventWeatherAdvice">{result.advice.slice(0, 3).map((item) => <span key={`${item.title}-${item.copy}`}><strong>{item.title}</strong><small>{item.copy}</small></span>)}</div> : null}
          {result.almanac && (
            <>
              <p className="destinationHistoryWarning"><strong>Historical pattern only — not a forecast.</strong> These records show what happened on the same calendar date in the previous five years.</p>
              <div className="destinationHistoryYears">{result.almanac.years.map((year) => <span key={year.year}><strong>{year.year}</strong><small>{year.condition}</small><b>{year.high_f}° / {year.low_f}°</b></span>)}</div>
            </>
          )}
          <Link className="eventResultCta" href="/#planner">Turn this weather check into an event <span aria-hidden="true">→</span></Link>
        </div>
      )}
    </section>
  );
}
