"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import WeatherIcon from "../components/WeatherIcon";

type WeatherDay = { date: string; weather_code: number; temp_max_f: number; temp_min_f: number; precip_prob_pct: number; wind_max_mph: number; shortForecast?: string };
type HomeWeather = { label?: string; current: { temp_f: number; feels_like_f: number; wind_mph: number | null } | null; days: WeatherDay[] };

function condition(code: number) {
  if (code >= 200 && code < 300) return "Thunderstorms possible";
  if (code >= 300 && code < 700) return "Wet weather possible";
  if (code === 800) return "Clear";
  if (code <= 802) return "Partly cloudy";
  return "Mostly cloudy";
}

export default function TodayWeather({ initialDate = "" }: { initialDate?: string }) {
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
  const selected = weather?.days?.find((day) => day.date === initialDate) || today;
  return (
    <section className="todayDashboard" aria-live="polite">
      <div className="todayPrimary">
        <div className="todayCurrentCopy">
          <p className="publicKicker">{weather?.label || "Your weather dashboard"}</p>
          <h2>{weather?.current ? `${weather.current.temp_f}°` : "Current conditions are being checked"}</h2>
          <p>{error || (weather?.current ? `Feels like ${weather.current.feels_like_f}°. ${typeof weather.current.wind_mph === "number" && Number.isFinite(weather.current.wind_mph) ? `Observed wind ${Math.round(weather.current.wind_mph)} mph.` : "Current wind observation unavailable."}` : "While the live observation arrives, you can still open the activity planner or weather history tool below.")}</p>
        </div>
        {today ? <WeatherIcon className="todayCurrentIcon" code={today.weather_code} title={today.shortForecast || condition(today.weather_code)} /> : null}
        <div className="todaySnapshot">
          <span><small>HIGH</small><strong>{today ? `${today.temp_max_f}°` : "—"}</strong></span>
          <span><small>LOW</small><strong>{today ? `${today.temp_min_f}°` : "—"}</strong></span>
          <span><small>RAIN</small><strong>{today ? `${today.precip_prob_pct}%` : "—"}</strong></span>
          <span><small>FORECAST PEAK WIND</small><strong>{today ? `${today.wind_max_mph} mph` : "—"}</strong></span>
        </div>
      </div>
      <div className="todayForecast">
        {(weather?.days || []).slice(0, 7).map((day) => <Link className={selected?.date === day.date ? "selected" : ""} href={`/today?date=${encodeURIComponent(day.date)}#day-details`} key={day.date}><div className="todayForecastTop"><small>{new Date(`${day.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" })}</small><WeatherIcon code={day.weather_code} /></div><strong>{day.temp_max_f}°</strong><span>{day.temp_min_f}° low</span><p>{day.shortForecast || condition(day.weather_code)}</p><b>{day.precip_prob_pct}% rain · {day.wind_max_mph} mph wind</b><em>Open day →</em></Link>)}
        {!weather && !error ? Array.from({ length: 5 }, (_, index) => <article className="weatherPlaceholder" key={index}><small>DAY {index + 1}</small><strong>—</strong><span>Live data on the way</span><p>Family Weather is contacting the weather service.</p></article>) : null}
      </div>
      {selected ? <div className="todayDayDetail" id="day-details">
        <div className="todayDayHeading"><div><p className="publicKicker">Selected day</p><h3>{new Date(`${selected.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</h3><p>{selected.shortForecast || condition(selected.weather_code)}</p></div><WeatherIcon code={selected.weather_code} title={selected.shortForecast || condition(selected.weather_code)} /></div>
        <div className="todayDayFacts"><span><small>HIGH / LOW</small><strong>{selected.temp_max_f}° / {selected.temp_min_f}°</strong></span><span><small>RAIN CHANCE</small><strong>{selected.precip_prob_pct}%</strong></span><span><small>PEAK WIND</small><strong>{selected.wind_max_mph} mph</strong></span></div>
        <p className="todayDecisionCopy"><strong>This is the weather view.</strong> To find a useful time window, tell the planner whether this is yard work, travel, a cookout, a wedding, or something else.</p>
        <div className="publicActionRow"><Link className="publicPrimary" href={`/plan?date=${encodeURIComponent(selected.date)}`}>Apply this day to an activity <span>→</span></Link></div>
      </div> : null}
      <div className="publicActionRow"><Link className="publicPrimary" href="/plan">Check an activity <span>→</span></Link><Link className="publicSecondary" href="/weather-history">Look up weather history</Link></div>
    </section>
  );
}
