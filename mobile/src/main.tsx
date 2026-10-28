import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { getValidSession, SITE_URL, type AuthSession } from "./api";
import { AccountScreen, AnnouncementsScreen, EventsScreen, PlanScreen } from "./screens";
import "./styles.css";

const LOCATION_KEY = "family-weather-native-location-v1";

type WeatherDay = {
  date: string;
  weather_code: number;
  temp_max_f: number | null;
  temp_min_f: number;
  precip_prob_pct: number;
  wind_max_mph: number;
  shortForecast?: string;
};

type Snapshot = {
  ok: boolean;
  label: string;
  lat: number;
  lon: number;
  timezone: string;
  source: string;
  current?: {
    temp_f: number;
    feels_like_f?: number;
    wind_mph?: number | null;
    humidity_pct?: number | null;
    weather_code: number;
  } | null;
  air_quality?: { us_aqi: number; category: string } | null;
  days: WeatherDay[];
};

type Tab = "home" | "plan" | "events" | "announcements" | "account";

function condition(code?: number) {
  if (code == null) return { label: "Checking conditions", icon: "◌" };
  if (code >= 200 && code < 300) return { label: "Thunderstorms", icon: "ϟ" };
  if (code >= 300 && code < 600) return { label: "Rain nearby", icon: "☂" };
  if (code >= 600 && code < 700) return { label: "Snow nearby", icon: "❄" };
  if (code >= 700 && code < 800) return { label: "Hazy skies", icon: "≋" };
  if (code === 800) return { label: "Clear skies", icon: "☀" };
  if (code <= 802) return { label: "Partly cloudy", icon: "◒" };
  return { label: "Cloudy skies", icon: "☁" };
}

function localDate(timeZone?: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${fields.year}-${fields.month}-${fields.day}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function round(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : "—";
}

async function weatherRequest(query = "") {
  const path = `/api/weather/home${query}`;
  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.get({ url: `${SITE_URL}${path}`, connectTimeout: 12000, readTimeout: 12000 });
    if (response.status < 200 || response.status >= 300 || !response.data?.ok) throw new Error("Weather is temporarily unavailable.");
    return response.data as Snapshot;
  }
  const response = await fetch(path, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data?.ok) throw new Error("Weather is temporarily unavailable.");
  return data as Snapshot;
}

function BrandMark() {
  return <span className="brandMark" aria-hidden="true"><span>☀</span></span>;
}

function App() {
  const [weather, setWeather] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState("Loading your weather desk…");
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [session, setSession] = useState<AuthSession | null>(null);

  const load = useCallback(async (query = "") => {
    setBusy(true);
    setStatus("Checking the latest observation…");
    try {
      const result = await weatherRequest(query);
      setWeather(result);
      setStatus("Latest available observation");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Weather is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void getValidSession().then(setSession);
    let query = "";
    try {
      const saved = JSON.parse(localStorage.getItem(LOCATION_KEY) || "null") as { lat?: number; lon?: number } | null;
      if (Number.isFinite(saved?.lat) && Number.isFinite(saved?.lon)) query = `?lat=${saved?.lat}&lon=${saved?.lon}`;
    } catch { /* Ignore malformed local preferences. */ }
    void load(query);
    const listener = NativeApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void load(query);
    });
    return () => { void listener.then((handle) => handle.remove()); };
  }, [load]);

  const today = useMemo(() => weather?.days?.find((day) => day.date === localDate(weather?.timezone)) || weather?.days?.[0], [weather]);
  const currentCode = weather?.current?.weather_code ?? today?.weather_code;
  const currentCondition = condition(currentCode);

  async function useLocation() {
    setBusy(true);
    setStatus("Finding your location…");
    try {
      const permission = await Geolocation.requestPermissions({ permissions: ["location"] });
      if (permission.location === "denied") throw new Error("Location permission was not allowed.");
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 900000 });
      const coords = { lat: position.coords.latitude, lon: position.coords.longitude };
      localStorage.setItem(LOCATION_KEY, JSON.stringify(coords));
      await load(`?lat=${coords.lat}&lon=${coords.lon}`);
      void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Location was not changed.");
      setBusy(false);
    }
  }

  async function selectTab(tab: Tab) {
    void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
    setActiveTab(tab);
  }

  return <div className="appShell">
    <header className="topBar">
      <div className="brand"><BrandMark/><span><strong>Family Weather</strong><small>Plan the day.</small></span></div>
      <button className="roundButton" type="button" onClick={() => void useLocation()} disabled={busy} aria-label="Use my current location">⌖</button>
    </header>

    <main>
      {activeTab === "home" ? <>
      <section className="heroCard" aria-busy={busy}>
        <div className="heroTop"><div><p className="eyebrow">RIGHT NOW</p><h1>{weather?.label || "Family Weather"}</h1><p className="status">{status}</p></div><button className="refresh" type="button" onClick={() => void load(weather ? `?lat=${weather.lat}&lon=${weather.lon}` : "")} disabled={busy} aria-label="Refresh weather">↻</button></div>
        <div className="temperatureRow"><strong>{round(weather?.current?.temp_f)}°</strong><span className="conditionIcon" aria-hidden="true">{currentCondition.icon}</span></div>
        <p className="conditionLabel">{currentCondition.label}</p>
        <div className="weatherFacts">
          <span><small>FEELS LIKE</small><b>{round(weather?.current?.feels_like_f)}°</b></span>
          <span><small>HIGH / LOW</small><b>{round(today?.temp_max_f)}° / {round(today?.temp_min_f)}°</b></span>
          <span><small>RAIN</small><b>{round(today?.precip_prob_pct)}%</b></span>
          <span><small>WIND</small><b>{round(weather?.current?.wind_mph ?? today?.wind_max_mph)} mph</b></span>
        </div>
      </section>

      <section className="actionCard">
        <div><p className="eyebrow dark">YOUR DAY, BETTER PLANNED</p><h2>What are you trying to do?</h2><p>Check the activity, place, and date. Family Weather will find the useful window and explain why it works.</p></div>
        <button className="primaryButton" type="button" onClick={() => setActiveTab("plan")}>Check a plan <span>→</span></button>
      </section>

      <section className="sectionBlock">
        <div className="sectionHeading"><div><p className="eyebrow dark">THE DAYS AHEAD</p><h2>Five-day desk</h2></div></div>
        <div className="forecastRail">
          {(weather?.days || []).slice(0, 5).map((day) => {
            const dayCondition = condition(day.weather_code);
            const label = day.date === localDate(weather?.timezone) ? "Today" : new Date(`${day.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" });
            return <article className="dayCard" key={day.date}><span>{label}</span><i aria-hidden="true">{dayCondition.icon}</i><strong>{round(day.temp_max_f)}°</strong><small>{round(day.temp_min_f)}° low</small><em>{round(day.precip_prob_pct)}% rain</em></article>;
          })}
          {!weather ? Array.from({ length: 5 }, (_, index) => <article className="dayCard skeleton" key={index}><span>DAY</span><i>◌</i><strong>—</strong><small>Loading</small></article>) : null}
        </div>
      </section>

      <section className="responsesCard">
        <span className="responseBell" aria-hidden="true">♢</span>
        <div><p className="eyebrow dark">RESPONSES</p><h2>RSVPs and announcement replies</h2><p>Sign in to see who responded and turn on native phone notifications.</p></div>
        <button type="button" onClick={() => setActiveTab(session ? "announcements" : "account")}>{session ? "Open replies" : "Sign in"} <span>→</span></button>
      </section>
      </> : null}
      {activeTab === "plan" ? <PlanScreen /> : null}
      {activeTab === "events" ? <EventsScreen session={session} switchTab={setActiveTab} /> : null}
      {activeTab === "announcements" ? <AnnouncementsScreen session={session} switchTab={setActiveTab} /> : null}
      {activeTab === "account" ? <AccountScreen session={session} setSession={setSession} /> : null}
    </main>

    <nav className="bottomNav" aria-label="Primary navigation">
      {([
        ["home", "⌂", "Home"],
        ["plan", "☀", "Plan"],
        ["events", "□", "Events"],
        ["announcements", "◇", "News"],
        ["account", "○", "Account"],
      ] as [Tab, string, string][]).map(([tab, icon, label]) => <button type="button" className={activeTab === tab ? "active" : ""} onClick={() => void selectTab(tab)} key={tab}><span aria-hidden="true">{icon}</span><small>{label}</small></button>)}
    </nav>
  </div>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
