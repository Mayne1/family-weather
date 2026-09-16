"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type WeatherDay = { date: string; weather_code: number; temp_max_f: number; temp_min_f: number; precip_prob_pct: number; wind_max_mph: number; shortForecast?: string };
type HomeWeather = { label?: string; current: { temp_f: number; feels_like_f: number; wind_mph: number } | null; days: WeatherDay[] };

function condition(code: number) {
  if (code >= 200 && code < 300) return "Thunderstorms possible";
  if (code >= 300 && code < 700) return "Wet weather possible";
  if (code === 800) return "Clear";
  if (code <= 802) return "Partly cloudy";
  return "Mostly cloudy";
}

export default function TodayWeather() {
  const [weather, setWeather] = useState<HomeWeather | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/weather/home", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || "Weather is temporarily unavailable.");
        setWeather(data);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Weather is temporarily unavailable."));
  }, []);

  const today = weather?.days?.[0];
  return (
    <section className="todayDashboard" aria-live="polite">
      <div className="todayPrimary">
        <div>
          <p className="publicKicker">{weather?.label || "Your weather dashboard"}</p>
          <h2>{weather?.current ? `${weather.current.temp_f}°` : "Current conditions are being checked"}</h2>
          <p>{error || (weather?.current ? `Feels like ${weather.current.feels_like_f}° with wind near ${weather.current.wind_mph} mph.` : "While the live observation arrives, you can still open the activity planner or weather history tool below.")}</p>
        </div>
        <div className="todaySnapshot">
          <span><small>HIGH</small><strong>{today ? `${today.temp_max_f}°` : "—"}</strong></span>
          <span><small>LOW</small><strong>{today ? `${today.temp_min_f}°` : "—"}</strong></span>
          <span><small>RAIN</small><strong>{today ? `${today.precip_prob_pct}%` : "—"}</strong></span>
          <span><small>WIND</small><strong>{today ? `${today.wind_max_mph} mph` : "—"}</strong></span>
        </div>
      </div>
      <div className="todayForecast">
        {(weather?.days || []).slice(0, 7).map((day) => <article key={day.date}><small>{new Date(`${day.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" })}</small><strong>{day.temp_max_f}°</strong><span>{day.temp_min_f}° low</span><p>{day.shortForecast || condition(day.weather_code)}</p><b>{day.precip_prob_pct}% rain · {day.wind_max_mph} mph wind</b></article>)}
        {!weather && !error ? Array.from({ length: 5 }, (_, index) => <article className="weatherPlaceholder" key={index}><small>DAY {index + 1}</small><strong>—</strong><span>Live data on the way</span><p>Family Weather is contacting the weather service.</p></article>) : null}
      </div>
      <div className="publicActionRow"><Link className="publicPrimary" href="/plan">Check an activity <span>→</span></Link><Link className="publicSecondary" href="/weather-history">Look up weather history</Link></div>
    </section>
  );
}
