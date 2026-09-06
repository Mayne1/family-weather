"use client";

import { FormEvent, useState } from "react";
import type { WeatherPlanningDestination } from "./destinations";

type AlmanacYear = {
  year: number;
  high_f: number;
  low_f: number;
  condition: string;
};

type PlanResult = {
  source: string;
  location: string;
  day: {
    date: string;
    temp_max_f: number;
    temp_min_f: number;
    precip_prob_pct: number;
    wind_max_mph: number;
    shortForecast?: string;
  };
  almanac?: {
    summary: string;
    rainFrequencyPct: number;
    years: AlmanacYear[];
  } | null;
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

export default function WeatherDateCheck({ destination }: { destination: WeatherPlanningDestination }) {
  const [date, setDate] = useState("");
  const [result, setResult] = useState<PlanResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function checkDate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!date) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/weather/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: destination.name,
          date,
          activity: "travel and outdoor plans",
          space: "outdoor",
          resolvedLocation: {
            id: destination.slug,
            input: destination.name,
            name: destination.shortName,
            label: destination.name,
            lat: destination.lat,
            lon: destination.lon,
            countryCode: destination.countryCode,
            country: destination.countryCode,
            admin1: "",
            locality: destination.shortName,
            postalCode: "",
            type: destination.type,
            provider: "family-weather",
            score: 1,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Weather lookup failed");
      setResult(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Weather information is unavailable right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="destinationDateCheck" aria-labelledby="destination-date-heading">
      <div>
        <p className="destinationKicker">Check your actual date</p>
        <h2 id="destination-date-heading">What could the weather be like in {destination.shortName}?</h2>
        <p>Choose a date. Family Weather uses a live forecast when the date is in range and five years of matching-date history when it is farther away.</p>
      </div>
      <form onSubmit={checkDate}>
        <label>
          <span>YOUR TRAVEL OR EVENT DATE</span>
          <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} required />
        </label>
        <button type="submit" disabled={loading || !date}>
          <span>{loading ? "Checking weather…" : "Check this date"}</span>
          <span aria-hidden="true">→</span>
        </button>
      </form>
      {error && <p className="destinationError" role="alert">{error}</p>}
      {result && (
        <div className="destinationWeatherResult" aria-live="polite">
          <div className="destinationResultHeading">
            <div>
              <small>{result.source === "almanac" ? "FIVE-YEAR HISTORICAL PATTERN" : "LIVE FORECAST"}</small>
              <h3>{dateLabel(result.day.date)}</h3>
            </div>
            <strong>{result.day.temp_max_f}°<small>high</small></strong>
          </div>
          <div className="destinationWeatherFacts">
            <span><small>LOW</small><strong>{result.day.temp_min_f}°F</strong></span>
            <span><small>{result.source === "almanac" ? "RAIN FREQUENCY" : "RAIN CHANCE"}</small><strong>{result.day.precip_prob_pct}%</strong></span>
            <span><small>PEAK WIND</small><strong>{result.day.wind_max_mph} mph</strong></span>
          </div>
          <p>{result.day.shortForecast || result.almanac?.summary}</p>
          {result.almanac && (
            <>
              <p className="destinationHistoryWarning"><strong>Historical pattern only — not a forecast.</strong> These records show what happened on the same calendar date in the previous five years.</p>
              <div className="destinationHistoryYears">
                {result.almanac.years.map((year) => (
                  <span key={year.year}>
                    <strong>{year.year}</strong>
                    <small>{year.condition}</small>
                    <b>{year.high_f}° / {year.low_f}°</b>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
