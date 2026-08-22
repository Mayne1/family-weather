"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getValidSession, signIn, signOut, signUp } from "./lib/firebaseAuth";
import type { AuthSession } from "./lib/firebaseAuth";

const activities = [
  ["cookout", "♨", "Cookout"],
  ["birthday", "✦", "Birthday"],
  ["park day", "♧", "Park day"],
  ["game", "◉", "Game"],
  ["concert", "♫", "Concert"],
  ["plan", "＋", "Something else"],
];

const fallbackForecast = [
  ["TODAY", "Saturday", "☀", "86°", "Best bet", "after 4 PM", "featured"],
  ["TOMORROW", "Sunday", "◒", "83°", "Easy day", "for outdoor plans", ""],
  ["MON", "Monday", "☁", "78°", "Comfortable", "most of the day", ""],
  ["TUE", "Tuesday", "☂", "72°", "Have cover", "ready after 2 PM", "caution"],
];

type WeatherDay = { date: string; weather_code: number; temp_max_f: number; temp_min_f: number; precip_prob_pct: number; wind_max_mph: number; shortForecast?: string };
type HomeWeather = { label?: string; lat?: number; lon?: number; current: { temp_f: number; feels_like_f: number; wind_mph: number; weather_code: number } | null; days: WeatherDay[] };
type PlanAdvice = { tone: string; title: string; copy: string };
type PlanResult = { source: string; location: string; day: WeatherDay; space: string; activity: string; score: number; bestWindow: string; advice: PlanAdvice[] };
type EventDetails = { name: string; activity: string; guests: string; location: string; date: string; time: string };
type CreatedInvite = { id: string; link: string; delivery: string; recipient_email?: string; recipient_phone?: string; sms?: { ok?: boolean; skipped?: boolean; reason?: string } };

function weatherSymbol(code: number) {
  if (code >= 200 && code < 700) return "☂";
  if (code === 800) return "☀";
  if (code > 800) return "◒";
  return "☁";
}

function weatherDescription(code: number) {
  if (code >= 200 && code < 300) return "Thunderstorms possible.";
  if (code >= 300 && code < 700) return "Wet weather is possible.";
  if (code === 741) return "Reduced visibility is possible.";
  if (code === 800) return "Clear and sunny.";
  if (code === 801) return "Mostly sunny.";
  if (code === 802) return "Partly cloudy.";
  if (code >= 803) return "Mostly cloudy.";
  return "Forecast loaded.";
}

function hasResolvedLocation(label?: string) {
  return Boolean(label && label !== "Your location");
}

export default function Home() {
  const [activity, setActivity] = useState("cookout");
  const [date, setDate] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [showEvent, setShowEvent] = useState(false);
  const [eventStep, setEventStep] = useState<"details" | "review">("details");
  const [eventSpace, setEventSpace] = useState("outdoor");
  const [homeWeather, setHomeWeather] = useState<HomeWeather | null>(null);
  const [homeLocation, setHomeLocation] = useState("Stockton, California");
  const [plannerLocation, setPlannerLocation] = useState("Stockton, CA 95206");
  const [locationLoading, setLocationLoading] = useState(false);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [savedEvent, setSavedEvent] = useState<{ id: string; title: string } | null>(null);
  const [saveError, setSaveError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [createdInvites, setCreatedInvites] = useState<CreatedInvite[]>([]);

  useEffect(() => {
    getValidSession().then(setSession);

    const applyWeather = (data: HomeWeather, updatePlanner = false) => {
      setHomeWeather(data);
      if (hasResolvedLocation(data.label)) {
        setHomeLocation(data.label!);
        if (updatePlanner) setPlannerLocation(data.label!);
        return true;
      }
      return false;
    };

    const loadDefault = () =>
      fetch("/api/weather/home", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : Promise.reject())
        .then((data) => data.ok && applyWeather(data))
        .catch(() => undefined);

    const loadCoordinates = (coordinates: { lat: number; lon: number }, remember: boolean) =>
      fetch(`/api/weather/home?lat=${coordinates.lat}&lon=${coordinates.lon}`, { cache: "no-store" })
        .then((response) => response.ok ? response.json() : Promise.reject())
        .then((data) => {
          if (!data.ok || !hasResolvedLocation(data.label)) {
            localStorage.removeItem("family-weather-home-location");
            return false;
          }
          if (remember) {
            localStorage.setItem("family-weather-home-location", JSON.stringify({
              ...coordinates,
              savedAt: Date.now(),
            }));
          }
          applyWeather(data, true);
          return true;
        })
        .catch(() => {
          localStorage.removeItem("family-weather-home-location");
          return false;
        });

    loadDefault();

    const saved = localStorage.getItem("family-weather-home-location");
    if (saved) {
      try {
        const coordinates = JSON.parse(saved);
        const fresh = Number(coordinates.savedAt || 0) > Date.now() - 6 * 60 * 60 * 1000;
        if (fresh && Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lon)) {
          loadCoordinates(coordinates, false);
          return;
        }
        localStorage.removeItem("family-weather-home-location");
      } catch {
        localStorage.removeItem("family-weather-home-location");
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        loadCoordinates({ lat: coords.latitude, lon: coords.longitude }, true);
      }, () => undefined, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    }
  }, []);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const coordinates = { lat: coords.latitude, lon: coords.longitude };
      fetch(`/api/weather/home?lat=${coordinates.lat}&lon=${coordinates.lon}`, { cache: "no-store" })
        .then((response) => response.ok ? response.json() : Promise.reject())
        .then((data) => {
          if (!data.ok || !hasResolvedLocation(data.label)) {
            throw new Error("We could not verify that location.");
          }
          localStorage.setItem("family-weather-home-location", JSON.stringify({
            ...coordinates,
            savedAt: Date.now(),
          }));
          setHomeWeather(data);
          setHomeLocation(data.label);
          setPlannerLocation(data.label);
        })
        .catch(() => localStorage.removeItem("family-weather-home-location"))
        .finally(() => setLocationLoading(false));
    }, () => setLocationLoading(false), {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  };

  const dateChoices = (homeWeather?.days || []).slice(0, 4);
  const chosenDay = dateChoices[date] || homeWeather?.days?.[0] || null;
  const selectedDate = chosenDay?.date || (() => {
    const value = new Date();
    value.setDate(value.getDate() + date);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  })();
  const selectedDay = plan?.day || chosenDay;
  const selectedBestWindow = plan?.bestWindow || (selectedDay ? selectedDay.temp_max_f >= 90 ? "5–8 PM" : selectedDay.temp_max_f >= 82 ? "4–7 PM" : selectedDay.temp_max_f < 65 ? "1–4 PM" : "12–3 PM" : "Checking…");

  const checkPlan = async () => {
    setPlanLoading(true);
    setPlanError("");
    setPlan(null);
    try {
      const response = await fetch("/api/weather/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: plannerLocation, date: selectedDate, activity, space: "outdoor" }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Weather check failed");
      setPlan(data);
      setShowResult(true);
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : "Weather check failed");
    } finally {
      setPlanLoading(false);
    }
  };

  const openEvent = () => {
    setShowResult(false);
    setEventStep("details");
    setShowEvent(true);
  };

  const reviewEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPlanLoading(true);
    setPlanError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const details = {
      name: String(values.name || "Family event"),
      activity: String(values.activity || "event"),
      guests: String(values.guests || ""),
      location: String(values.location || ""),
      date: String(values.date || ""),
      time: String(values.time || ""),
    };
    try {
      const response = await fetch("/api/weather/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, space: eventSpace }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Weather check failed");
      setEventDetails(details);
      setPlan(data);
      setEventStep("review");
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : "Weather check failed");
    } finally {
      setPlanLoading(false);
    }
  };

  const authenticate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setAuthLoading(true);
    setAuthError("");
    try {
      const email = String(values.get("email") || "").trim();
      const password = String(values.get("password") || "");
      const nextSession = authMode === "signin" ? await signIn(email, password) : await signUp(email, password);
      setSession(nextSession);
      setShowAuth(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const saveEvent = async () => {
    const activeSession = await getValidSession();
    if (!activeSession) {
      setSession(null);
      setShowAuth(true);
      return;
    }
    setSession(activeSession);
    if (!eventDetails || !plan) return;
    setSaveLoading(true);
    setSaveError("");
    try {
      const starts = new Date(`${eventDetails.date}T${eventDetails.time || "12:00"}:00`);
      const ends = new Date(starts.getTime() + 3 * 60 * 60 * 1000);
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeSession.idToken}` },
        body: JSON.stringify({
          title: eventDetails.name,
          description: `${eventDetails.activity} · ${eventSpace} · ${eventDetails.guests || "unspecified"} guests · Weather fit ${plan.score}/100 · Best window ${plan.bestWindow}`,
          location: eventDetails.location,
          starts_at: starts.toISOString(),
          ends_at: ends.toISOString(),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        if (response.status === 401) {
          signOut();
          setSession(null);
          setShowAuth(true);
          throw new Error("Your sign-in expired. Please sign in again.");
        }
        throw new Error(data.error || "Event could not be saved");
      }
      setSavedEvent(data.event);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Event could not be saved");
    } finally {
      setSaveLoading(false);
    }
  };

  const createInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!savedEvent) return;
    const values = new FormData(event.currentTarget);
    const recipientText = String(values.get("recipients") || "").trim();
    const recipients = [...new Set(
      recipientText
        .split(/[\\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    )];
    const invalid = recipients.filter((email) => !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email));
    if (!recipients.length) {
      setInviteError("Enter at least one email address.");
      return;
    }
    if (recipients.length > 100) {
      setInviteError("Paste no more than 100 email addresses at a time.");
      return;
    }
    if (invalid.length) {
      setInviteError(`Fix these email addresses: ${invalid.slice(0, 5).join(", ")}${invalid.length > 5 ? "…" : ""}`);
      return;
    }
    setInviteLoading(true);
    setInviteError("");
    try {
      const activeSession = await getValidSession();
      if (!activeSession) throw new Error("Your sign-in expired. Sign in again before creating an invitation.");
      setSession(activeSession);
      const response = await fetch(`/api/events/${encodeURIComponent(savedEvent.id)}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeSession.idToken}` },
        body: JSON.stringify({
          delivery: "email",
          recipient_emails: recipients,
          created_by_email: activeSession.email,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Invitation could not be created");
      setCreatedInvites((current) => [...data.invites, ...current]);
      form.reset();
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Invitation could not be created");
    } finally {
      setInviteLoading(false);
    }
  };

  const today = homeWeather?.days?.[0];
  const liveForecast = homeWeather?.days?.length
    ? homeWeather.days.map((item, index) => [index === 0 ? "TODAY" : index === 1 ? "TOMORROW" : new Date(`${item.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(), new Date(`${item.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" }), weatherSymbol(item.weather_code), `${item.temp_max_f}°`, item.precip_prob_pct < 20 ? "Low rain risk" : "Watch the rain", `${item.precip_prob_pct}% chance · wind ${item.wind_max_mph} mph`, index === 0 ? "featured" : item.precip_prob_pct >= 40 ? "caution" : ""])
    : fallbackForecast;

  return (
    <>
      <div className="weatherScene" aria-hidden="true">
        <span className="sunGlow" />
        <span className="cloud cloudOne" />
        <span className="cloud cloudTwo" />
      </div>

      <header className="siteHeader">
        <a className="brand" href="#top" aria-label="Family Weather home">
          <span className="brandMark"><i /><i /><i /></span>
          <span><strong>Family Weather</strong><small>Plan together. Weather better.</small></span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#planner">Plan</a><a href="#outlook">Outlook</a><a href="#how">How it works</a><a href="/events">My events</a>
        </nav>
        <div className="headerActions">
          {session ? <button className="textButton" type="button" onClick={() => { signOut(); setSession(null); }}>{session.email} · Sign out</button> : <button className="textButton" type="button" onClick={() => setShowAuth(true)}>Sign in</button>}
          <button className="pillButton" type="button" onClick={openEvent}>Create event</button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="heroCopy">
            <p className="eyebrow"><span /> {homeLocation} · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
            <h1>Make the plan.<br /><em>Know the weather.</em></h1>
            <p className="intro">Family Weather turns the forecast into a simple decision—when to go, what to expect, and what your people need to know.</p>
            <div className="decisionCard">
              <div className="decisionTop"><span className="statusDot" /><span>{homeLocation} right now</span><strong>LIVE</strong></div>
              <div className="decisionMain">
                <div><span className="temperature">{homeWeather?.current?.temp_f ?? "—"}°</span><span className="condition">Feels like {homeWeather?.current?.feels_like_f ?? "—"}°<br />Wind {homeWeather?.current?.wind_mph ?? "—"} mph</span></div>
                <div className="score" aria-label="Today’s forecast high"><span>{today?.temp_max_f ?? "—"}°</span><small>HIGH</small></div>
              </div>
              <p><strong>{today ? (today.shortForecast || weatherDescription(today.weather_code)) : "Loading forecast…"}</strong> {today ? `${today.precip_prob_pct}% rain chance with wind near ${today.wind_max_mph} mph.` : "Real weather is being requested from the Family Weather engine."}</p>
            </div>
          </div>

          <div className="plannerCard" id="planner">
            <p className="stepLabel">Plan something</p><h2>What are we doing?</h2>
            <div className="activityGrid" role="group" aria-label="Choose an activity">
              {activities.map(([value, icon, label]) => (
                <button key={value} className={`activity ${activity === value ? "active" : ""}`} onClick={() => setActivity(value)} type="button"><span>{icon}</span>{label}</button>
              ))}
            </div>
            <label className="fieldLabel" htmlFor="location">Where?</label>
            <div className="inputShell"><span aria-hidden="true">⌖</span><input id="location" value={plannerLocation} onChange={(event) => setPlannerLocation(event.target.value)} autoComplete="off" /><button type="button" onClick={useCurrentLocation} disabled={locationLoading} aria-label="Use current location">{locationLoading ? "…" : "◎"}</button></div>
            <span className="fieldLabel">When?</span>
            <div className="dateRow">
              {(dateChoices.length ? dateChoices : Array.from({ length: 4 }, (_, index) => ({ date: (() => { const value = new Date(); value.setDate(value.getDate() + index); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`; })() }))).map((choice, index) => { const value = new Date(`${choice.date}T12:00:00`); return (
                <button key={choice.date} className={`dateOption ${date === index ? "active" : ""}`} onClick={() => setDate(index)} type="button"><small>{value.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}</small><strong>{value.getDate()}</strong><span>{index === 0 ? "Today" : index === 1 ? "Tomorrow" : value.toLocaleDateString("en-US", { weekday: "long" })}</span></button>
              ); })}
            </div>
            <button className="primaryCta" type="button" onClick={checkPlan} disabled={planLoading}>{planLoading ? "Checking the sky…" : "Check my plan"} <span>→</span></button>
            {planError && <p className="formError" role="alert">{planError}</p>}
            <p className="quietNote">No account needed to check the weather.</p>
          </div>
        </section>

        <section className="outlook" id="outlook">
          <div className="sectionHeading"><div><p className="eyebrow dark"><span /> The next few days</p><h2>Weather you can use.</h2></div><p>Not just numbers. Each day comes with a plain-language recommendation for your plans.</p></div>
          <div className="forecastGrid">
            {liveForecast.map(([label, day, icon, temp, lead, copy, style]) => (
              <article className={`forecastDay ${style}`} key={day}><div><small>{label}</small><h3>{day}</h3></div><span className="weatherIcon" aria-hidden="true">{icon}</span><strong>{temp}</strong><p><b>{lead}</b> {copy}</p></article>
            ))}
          </div>
        </section>

        <section className="how" id="how">
          <p className="eyebrow dark"><span /> One plan, everybody informed</p><h2>From “what if?” to “we’re ready.”</h2>
          <div className="steps">
            <article><span>01</span><h3>Tell us the plan</h3><p>Pick the activity, place and date. Checking a plan doesn’t require an account.</p></article>
            <article><span>02</span><h3>Get a real answer</h3><p>See the best time, the important risks and practical advice—not a wall of weather data.</p></article>
            <article><span>03</span><h3>Keep people together</h3><p>Create the event, invite your people and send updates if the weather changes.</p></article>
          </div>
        </section>
      </main>

      <footer><div className="brand"><span className="brandMark"><i /><i /><i /></span><span><strong>Family Weather</strong><small>Plans change. Families stay connected.</small></span></div><p><a href="mailto:contact@thefamilyweather.com">contact@thefamilyweather.com</a></p><p>Privacy · Terms · SMS consent</p></footer>

      {showResult && plan && <div className="modal" role="dialog" aria-modal="true" aria-labelledby="result-title" onMouseDown={(event) => event.target === event.currentTarget && setShowResult(false)}><div className="modalCard"><button className="close" type="button" onClick={() => setShowResult(false)} aria-label="Close">×</button><p className="eyebrow dark"><span /> {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p><h2 id="result-title">Your {activity} has a weather window.</h2><p className="resultLocation">Official NWS forecast for <strong>{plan.location}</strong></p><div className="resultAnswer"><span>BEST TIME</span><strong>{selectedBestWindow}</strong></div><p>{`${plan.day.shortForecast || "Forecast available"}. High ${plan.day.temp_max_f}°, ${plan.day.precip_prob_pct}% rain chance, and wind near ${plan.day.wind_max_mph} mph.`}</p><button className="primaryCta" type="button" onClick={openEvent}>Create this event <span>→</span></button></div></div>}

      {showEvent && (
        <div className="eventOverlay" role="dialog" aria-modal="true" aria-labelledby="event-title" onMouseDown={(event) => event.target === event.currentTarget && setShowEvent(false)}>
          <section className="eventPanel">
            <button className="close" type="button" onClick={() => setShowEvent(false)} aria-label="Close">×</button>
            <div className="eventHeader">
              <p className="eyebrow dark"><span /> Create an event</p>
              <p className="progressLabel">{eventStep === "details" ? "01 · THE PLAN" : "02 · WEATHER CHECK"}</p>
            </div>

            {eventStep === "details" ? (
              <form className="eventForm" onSubmit={reviewEvent}>
                <h2 id="event-title">Tell us what you’re planning.</h2>
                <p className="formIntro">Just the useful details. We’ll use them to judge the weather for this particular event.</p>

                <div className="formGrid">
                  <label className="formField full"><span>Event name</span><input name="name" required placeholder="Johnson family cookout" /></label>
                  <label className="formField"><span>Activity</span><select name="activity" defaultValue={activity}><option>cookout</option><option>birthday</option><option>park day</option><option>game</option><option>concert</option><option>family gathering</option><option>other</option></select></label>
                  <label className="formField"><span>Guests</span><input name="guests" type="number" min="1" defaultValue="12" /></label>
                  <label className="formField full"><span>Location or ZIP code</span><input name="location" required defaultValue={plannerLocation} /></label>
                  <label className="formField"><span>Date</span><input name="date" type="date" defaultValue={selectedDate} /></label>
                  <label className="formField"><span>Start time</span><input name="time" type="time" defaultValue="16:00" /></label>
                </div>

                <fieldset className="spaceChoice">
                  <legend>Where will people spend their time?</legend>
                  <div>
                    {[["indoor", "⌂", "Indoor", "Weather matters mostly for travel."], ["outdoor", "☀", "Outdoor", "Comfort and exposure matter most."], ["both", "◐", "Both", "We’ll evaluate inside and outside." ]].map(([value, icon, title, copy]) => (
                      <button key={value} className={eventSpace === value ? "active" : ""} type="button" onClick={() => setEventSpace(value)}><b>{icon}</b><span><strong>{title}</strong><small>{copy}</small></span></button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="concerns">
                  <legend>What could ruin the plan?</legend>
                  <label><input name="concern" value="rain" type="checkbox" defaultChecked /> Rain</label><label><input name="concern" value="heat" type="checkbox" defaultChecked /> Heat</label><label><input name="concern" value="wind" type="checkbox" /> Wind</label><label><input name="concern" value="air" type="checkbox" /> Air quality</label>
                </fieldset>

                {planError && <p className="formError">{planError}</p>}
                <button className="primaryCta" type="submit" disabled={planLoading}>{planLoading ? "Checking real weather…" : "Review the weather fit"} <span>→</span></button>
              </form>
            ) : (
              <div className="eventReview">
                <button className="backButton" type="button" onClick={() => setEventStep("details")}>← Edit details</button>
                <h2>{(plan?.score ?? 0) >= 80 ? "This plan has a strong weather window." : (plan?.score ?? 0) >= 60 ? "This plan can work with preparation." : "This plan needs a backup."}</h2>
                <p className="formIntro">Real {plan?.source?.toUpperCase() || "weather"} data for {plan?.location}. The recommendation reflects an {plan?.space} {plan?.activity}.</p>
                <div className="reviewScore"><div><small>WEATHER FIT</small><strong>{plan?.score ?? "—"}</strong><span>out of 100</span></div><div><small>BEST WINDOW</small><strong>{plan?.bestWindow ?? "—"}</strong><span>Based on the selected setting</span></div></div>
                <div className="adviceList">{plan?.advice.map((item) => <article key={item.title} className={item.tone === "warn" ? "warning" : ""}><span>{item.tone === "warn" ? "!" : "✓"}</span><div><strong>{item.title}</strong><p>{item.copy}</p></div></article>)}</div>
                {savedEvent ? <><div className="savedNotice"><strong>Event saved.</strong><span>{savedEvent.title} is now in Family Weather.</span></div><form className="inviteBuilder" onSubmit={createInvite}><div><small>03 · INVITE YOUR PEOPLE</small><h3>Create private RSVP links.</h3><p>Paste up to 100 email addresses. Separate them with commas, semicolons, spaces, or new lines. Each person receives their own private response link.</p></div><label className="formField"><span>Family members’ email addresses</span><textarea name="recipients" required rows={5} placeholder={"maya@example.com, jordan@example.com\\nterry@example.com"} /></label><button className="primaryCta" disabled={inviteLoading}>{inviteLoading ? "Creating invitations…" : "Create invitations"}<span>→</span></button>{inviteError && <p className="formError">{inviteError}</p>}</form>{createdInvites.length > 0 && <div className="inviteResults">{createdInvites.map((invite) => <article key={invite.id}><div><strong>{invite.recipient_email || "Shareable invitation"}</strong><small>Link ready to share</small></div><button type="button" onClick={() => navigator.clipboard.writeText(invite.link)}>Copy link</button><a href={invite.link} target="_blank" rel="noreferrer">Open</a></article>)}</div>}</> : <button className="primaryCta" type="button" onClick={saveEvent} disabled={saveLoading}>{saveLoading ? "Saving event…" : session ? "Save event and continue to invitations" : "Sign in to save this event"} <span>→</span></button>}
                {saveError && <p className="formError">{saveError}</p>}
                <p className="quietNote">{savedEvent ? `Event ID: ${savedEvent.id}` : session ? `Saving as ${session.email}` : "Your plan stays on this screen while you sign in."}</p>
              </div>
            )}
          </section>
        </div>
      )}

      {showAuth && <div className="modal authModal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => event.target === event.currentTarget && setShowAuth(false)}><form className="modalCard" onSubmit={authenticate}><button className="close" type="button" onClick={() => setShowAuth(false)} aria-label="Close">×</button><p className="eyebrow dark"><span /> Family Weather account</p><h2 id="auth-title">{authMode === "signin" ? "Welcome back." : "Create your account."}</h2><p>{authMode === "signin" ? "Sign in to save this plan and invite your family." : "Use your email to keep events and invitations together."}</p><label className="formField"><span>Email address</span><input name="email" type="email" required autoComplete="email" /></label><label className="formField"><span>Password</span><input name="password" type="password" required minLength={6} autoComplete={authMode === "signin" ? "current-password" : "new-password"} /></label>{authError && <p className="formError">{authError}</p>}<button className="primaryCta" type="submit" disabled={authLoading}>{authLoading ? "One moment…" : authMode === "signin" ? "Sign in" : "Create account"}<span>→</span></button><button className="authSwitch" type="button" onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setAuthError(""); }}>{authMode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}</button></form></div>}
    </>
  );
}
