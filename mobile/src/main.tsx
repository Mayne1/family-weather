import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { getValidSession, SITE_URL, type AuthSession } from "./api";
import { AccountScreen, AnnouncementsScreen, EventsScreen, PlanScreen, type PlanHandoff } from "./screens";
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

function localHour(timeZone?: string) {
  try { return Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(new Date())); }
  catch { return new Date().getHours(); }
}

function weatherMood(code: number | undefined, timeZone?: string) {
  const hour = localHour(timeZone);
  if (hour < 6 || hour >= 19) return "night";
  if (code != null && code >= 200 && code < 300) return "storm";
  if (code != null && code >= 300 && code < 600) return "rain";
  if (code != null && code >= 600 && code < 700) return "snow";
  if (code != null && (code === 801 || code === 802)) return "partly";
  if (code != null && (code >= 700 || code > 802)) return "cloudy";
  return "sunny";
}

function weatherBrief(label: string, rain?: number | null, wind?: number | null) {
  const rainChance = typeof rain === "number" ? Math.round(rain) : null;
  const windSpeed = typeof wind === "number" ? Math.round(wind) : null;
  const rainCopy = rainChance == null
    ? ""
    : rainChance >= 60
      ? ` Rain is likely, with a ${rainChance}% daytime chance.`
      : rainChance >= 25
        ? ` Keep an eye on a ${rainChance}% chance of rain.`
        : ` Rain stays limited at ${rainChance}%.`;
  const windCopy = windSpeed == null ? "" : ` Peak wind is around ${windSpeed} mph.`;
  return `${label} set the tone for today.${rainCopy}${windCopy}`;
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
  return <span className="brandMark" aria-hidden="true"><Icon name="sun" /></span>;
}

function Icon({ name }: { name: Tab | "sun" | "location" | "refresh" }) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="M3.5 10.8 12 3.8l8.5 7"/><path d="M5.7 9.8v10h12.6v-10M9.5 19.8v-6.3h5v6.3"/></>,
    plan: <><circle cx="12" cy="12" r="3.6"/><path d="M12 2.7v2.1M12 19.2v2.1M2.7 12h2.1M19.2 12h2.1M5.4 5.4l1.5 1.5M17.1 17.1l1.5 1.5M18.6 5.4l-1.5 1.5M6.9 17.1l-1.5 1.5"/></>,
    events: <><rect x="3.5" y="5.5" width="17" height="15" rx="2.5"/><path d="M7.5 3v5M16.5 3v5M3.5 10h17M8 14h2M14 14h2M8 17.5h2"/></>,
    announcements: <><path d="M4 5.5h16v11H9l-5 4v-15Z"/><path d="M8 9h8M8 13h5"/></>,
    account: <><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.7-4.3 3.2-6.5 7.5-6.5s6.8 2.2 7.5 6.5"/></>,
    sun: <><circle cx="12" cy="12" r="3.7"/><path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6"/></>,
    location: <><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/></>,
    refresh: <><path d="M19.5 8.5A8 8 0 1 0 20 15"/><path d="M19.5 3.5v5h-5"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function App() {
  const [weather, setWeather] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState("Loading your weather desk…");
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [eventDraft, setEventDraft] = useState<PlanHandoff | null>(null);
  const [announcementDraft, setAnnouncementDraft] = useState<PlanHandoff | null>(null);
  const [selectedForecastDate, setSelectedForecastDate] = useState<string | null>(null);
  const [planDate, setPlanDate] = useState<string | null>(null);

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
  const mood = weatherMood(currentCode, weather?.timezone);
  const selectedForecastDay = weather?.days?.find((day) => day.date === selectedForecastDate) || null;

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

  return <div className={`appShell ${activeTab === "home" ? `homeActive mood-${mood}` : ""}`}>
    <header className={`topBar ${activeTab === "home" ? "homeTopBar" : ""}`}>
      <div className="brand"><BrandMark/><span><strong>Family Weather</strong><small>Plan the day.</small></span></div>
      <button className="roundButton" type="button" onClick={() => void useLocation()} disabled={busy} aria-label="Use my current location"><Icon name="location" /></button>
    </header>

    <main className={activeTab === "home" ? "homeMain" : ""}>
      {activeTab === "home" ? <>
      <section className="weatherStage" aria-busy={busy}>
        <div className="weatherScene" aria-hidden="true"><span className="sceneOrb">{mood === "night" ? "☾" : mood === "storm" ? "ϟ" : mood === "snow" ? "✦" : ""}</span><i className="sceneCloud cloudOne"/><i className="sceneCloud cloudTwo"/><i className="sceneCloud cloudThree"/><i className="sceneHill hillBack"/><i className="sceneHill hillFront"/><b className="sceneRain rainOne"/><b className="sceneRain rainTwo"/><b className="sceneRain rainThree"/></div>
        <div className="weatherFocus">
          <div className="locationLine"><Icon name="location"/><span>HOME</span></div>
          <h1>{weather?.label || "Family Weather"}</h1>
          <strong className="stageTemperature">{round(weather?.current?.temp_f)}°</strong>
          <p className="stageCondition">{currentCondition.label}</p>
          <p className="stageRange">H:{round(today?.temp_max_f)}° <span>L:{round(today?.temp_min_f)}°</span></p>
          <p className="stageStatus">{status}</p>
        </div>

        <section className="glassPanel todayBrief">
          <div className="briefHeading"><span>{currentCondition.icon}</span><p>{weatherBrief(currentCondition.label, today?.precip_prob_pct, weather?.current?.wind_mph ?? today?.wind_max_mph)}</p></div>
          <div className="metricStrip">
            <span><small>FEELS</small><b>{round(weather?.current?.feels_like_f)}°</b></span>
            <span><small>RAIN</small><b>{round(today?.precip_prob_pct)}%</b></span>
            <span><small>WIND</small><b>{round(weather?.current?.wind_mph ?? today?.wind_max_mph)} mph</b></span>
            <span><small>AIR</small><b>{weather?.air_quality?.us_aqi != null ? round(weather.air_quality.us_aqi) : "—"}</b></span>
          </div>
        </section>

        <section className="glassPanel forecastList">
          <div className="glassTitle"><span>▦</span><strong>5-DAY FORECAST</strong></div>
          <div className="forecastRows">
            {(weather?.days || []).slice(0, 5).map((day) => {
              const dayCondition = condition(day.weather_code);
              const label = day.date === localDate(weather?.timezone) ? "Today" : new Date(`${day.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" });
              const low = typeof day.temp_min_f === "number" ? day.temp_min_f : 0;
              const high = typeof day.temp_max_f === "number" ? day.temp_max_f : low;
              const width = Math.max(18, Math.min(100, 28 + (high - low) * 3));
              const selected = selectedForecastDate === day.date;
              return <button className={`forecastRowButton ${selected ? "selected" : ""}`} type="button" key={day.date} aria-expanded={selected} onClick={() => {
                setSelectedForecastDate(selected ? null : day.date);
                void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
              }}><strong>{label}</strong><span className="forecastIcon" aria-hidden="true">{dayCondition.icon}<small>{day.precip_prob_pct >= 20 ? `${round(day.precip_prob_pct)}%` : ""}</small></span><b className="lowTemp">{round(day.temp_min_f)}°</b><i><em style={{ width: `${width}%` }}/></i><b>{round(day.temp_max_f)}°</b><span className="forecastChevron" aria-hidden="true">›</span></button>;
            })}
            {!weather ? Array.from({ length: 5 }, (_, index) => <div className="forecastRowButton skeleton" key={index}><strong>Day</strong><span>◌</span><b>—</b><i/><b>—</b><span/></div>) : null}
          </div>
          {selectedForecastDay ? <div className="forecastDayDetail">
            <div><span className="forecastDetailIcon" aria-hidden="true">{condition(selectedForecastDay.weather_code).icon}</span><p><strong>{new Date(`${selectedForecastDay.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</strong><small>{selectedForecastDay.shortForecast || condition(selectedForecastDay.weather_code).label}</small></p></div>
            <p>High near {round(selectedForecastDay.temp_max_f)}° and low around {round(selectedForecastDay.temp_min_f)}°. Rain chance {round(selectedForecastDay.precip_prob_pct)}%. Peak wind around {round(selectedForecastDay.wind_max_mph)} mph.</p>
            <button type="button" onClick={() => { setPlanDate(selectedForecastDay.date); setActiveTab("plan"); }}>Plan for this day <span>→</span></button>
          </div> : null}
        </section>

        <section className="plannerSpotlight">
          <div><p className="eyebrow">ONLY FAMILY WEATHER</p><h2>Don’t just check it.<br/>Plan around it.</h2><p>Choose what you’re doing. We’ll find the best weather window and explain why it works.</p></div>
          <button type="button" onClick={() => { setPlanDate(null); setActiveTab("plan"); }}><span>Check a plan</span><b>→</b></button>
        </section>
      </section>

      <section className="responsesCard">
        <span className="responseBell" aria-hidden="true">♢</span>
        <div><p className="eyebrow dark">RESPONSES</p><h2>RSVPs and announcement replies</h2><p>Sign in to see who responded and turn on native phone notifications.</p></div>
        <button type="button" onClick={() => setActiveTab(session ? "announcements" : "account")}>{session ? "Open replies" : "Sign in"} <span>→</span></button>
      </section>
      </> : null}
      {activeTab === "plan" ? <PlanScreen initialDate={planDate} continueWith={(kind, draft) => { if (kind === "event") { setEventDraft(draft); setActiveTab("events"); } else { setAnnouncementDraft(draft); setActiveTab("announcements"); } }} /> : null}
      {activeTab === "events" ? <EventsScreen session={session} switchTab={setActiveTab} draft={eventDraft} clearDraft={() => setEventDraft(null)} /> : null}
      {activeTab === "announcements" ? <AnnouncementsScreen session={session} switchTab={setActiveTab} draft={announcementDraft} clearDraft={() => setAnnouncementDraft(null)} /> : null}
      {activeTab === "account" ? <AccountScreen session={session} setSession={setSession} switchTab={setActiveTab} /> : null}
    </main>

    <nav className="bottomNav" aria-label="Primary navigation">
      {([
        ["home", "Home"],
        ["plan", "Plan"],
        ["events", "Events"],
        ["announcements", "Announcements"],
        ["account", session ? "Account" : "Sign in"],
      ] as [Tab, string][]).map(([tab, label]) => <button type="button" className={activeTab === tab ? "active" : ""} onClick={() => void selectTab(tab)} key={tab}><span aria-hidden="true"><Icon name={tab} /></span><small>{label}</small></button>)}
    </nav>
  </div>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
