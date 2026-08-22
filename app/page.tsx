"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { loadSession, signIn, signOut, signUp } from "./lib/firebaseAuth";
import type { AuthSession } from "./lib/firebaseAuth";

const activities = [
  ["cookout", "♨", "Cookout"],
  ["birthday", "✦", "Birthday"],
  ["park day", "♧", "Park day"],
  ["game", "◉", "Game"],
  ["concert", "♫", "Concert"],
  ["plan", "＋", "Something else"],
];

const dates = [
  ["SAT", "22", "Today"],
  ["SUN", "23", "Tomorrow"],
  ["MON", "24", "Monday"],
  ["MORE", "＋", "Choose"],
];

const fallbackForecast = [
  ["TODAY", "Saturday", "☀", "86°", "Best bet", "after 4 PM", "featured"],
  ["TOMORROW", "Sunday", "◒", "83°", "Easy day", "for outdoor plans", ""],
  ["MON", "Monday", "☁", "78°", "Comfortable", "most of the day", ""],
  ["TUE", "Tuesday", "☂", "72°", "Have cover", "ready after 2 PM", "caution"],
];

type WeatherDay = { date: string; weather_code: number; temp_max_f: number; temp_min_f: number; precip_prob_pct: number; wind_max_mph: number; shortForecast?: string };
type HomeWeather = { current: { temp_f: number; feels_like_f: number; wind_mph: number; weather_code: number }; days: WeatherDay[] };
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

export default function Home() {
  const [activity, setActivity] = useState("cookout");
  const [date, setDate] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [showEvent, setShowEvent] = useState(false);
  const [eventStep, setEventStep] = useState<"details" | "review">("details");
  const [eventSpace, setEventSpace] = useState("outdoor");
  const [homeWeather, setHomeWeather] = useState<HomeWeather | null>(null);
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
    setSession(loadSession());
    fetch("/api/weather/home", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => data.ok && setHomeWeather(data))
      .catch(() => setHomeWeather(null));
  }, []);

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
    if (!session) {
      setShowAuth(true);
      return;
    }
    if (!eventDetails || !plan) return;
    setSaveLoading(true);
    setSaveError("");
    try {
      const starts = new Date(`${eventDetails.date}T${eventDetails.time || "12:00"}:00`);
      const ends = new Date(starts.getTime() + 3 * 60 * 60 * 1000);
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.idToken}` },
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
    const recipient = String(values.get("recipient") || "").trim();
    setInviteLoading(true);
    setInviteError("");
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(savedEvent.id)}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.idToken || ""}` },
        body: JSON.stringify({
          delivery: "email",
          recipient_email: recipient,
          created_by_email: session?.email || null,
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
            <p className="eyebrow"><span /> Stockton · Saturday, August 22</p>
            <h1>Make the plan.<br /><em>Know the weather.</em></h1>
            <p className="intro">Family Weather turns the forecast into a simple decision—when to go, what to expect, and what your people need to know.</p>
            <div className="decisionCard">
              <div className="decisionTop"><span className="statusDot" /><span>Stockton right now</span><strong>LIVE</strong></div>
              <div className="decisionMain">
                <div><span className="temperature">{homeWeather?.current?.temp_f ?? "—"}°</span><span className="condition">Feels like {homeWeather?.current?.feels_like_f ?? "—"}°<br />Wind {homeWeather?.current?.wind_mph ?? "—"} mph</span></div>
                <div className="score" aria-label="Today’s forecast high"><span>{today?.temp_max_f ?? "—"}°</span><small>HIGH</small></div>
              </div>
              <p><strong>{today?.shortForecast || "Loading forecast…"}</strong> {today ? `${today.precip_prob_pct}% rain chance with wind near ${today.wind_max_mph} mph.` : "Real weather is being requested from the Family Weather engine."}</p>
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
            <div className="inputShell"><span aria-hidden="true">⌖</span><input id="location" defaultValue="Stockton, California" autoComplete="off" /><button type="button" aria-label="Use current location">◎</button></div>
            <span className="fieldLabel">When?</span>
            <div className="dateRow">
              {dates.map(([day, number, label], index) => (
                <button key={day} className={`dateOption ${date === index ? "active" : ""}`} onClick={() => setDate(index)} type="button"><small>{day}</small><strong>{number}</strong><span>{label}</span></button>
              ))}
            </div>
            <button className="primaryCta" type="button" onClick={() => setShowResult(true)}>Check my plan <span>→</span></button>
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

      {showResult && <div className="modal" role="dialog" aria-modal="true" aria-labelledby="result-title" onMouseDown={(event) => event.target === event.currentTarget && setShowResult(false)}><div className="modalCard"><button className="close" type="button" onClick={() => setShowResult(false)} aria-label="Close">×</button><p className="eyebrow dark"><span /> Your planning answer</p><h2 id="result-title">Your {activity} looks good.</h2><div className="resultAnswer"><span>BEST TIME</span><strong>4–7 PM</strong></div><p>Clear skies and manageable heat. Set up shade for the first hour and secure lightweight table coverings.</p><button className="primaryCta" type="button" onClick={openEvent}>Create this event <span>→</span></button></div></div>}

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
                  <label className="formField full"><span>Location or ZIP code</span><input name="location" required defaultValue="Stockton, CA 95206" /></label>
                  <label className="formField"><span>Date</span><input name="date" type="date" defaultValue="2026-08-22" /></label>
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
                {savedEvent ? <><div className="savedNotice"><strong>Event saved.</strong><span>{savedEvent.title} is now in Family Weather.</span></div><form className="inviteBuilder" onSubmit={createInvite}><div><small>03 · INVITE YOUR PEOPLE</small><h3>Create a private RSVP link.</h3><p>Add one person at a time. You can copy and share every link yourself.</p></div><label className="formField"><span>Family member’s email</span><input name="recipient" required type="email" placeholder="family@example.com" /></label><button className="primaryCta" disabled={inviteLoading}>{inviteLoading ? "Creating invitation…" : "Create invitation"}<span>→</span></button>{inviteError && <p className="formError">{inviteError}</p>}</form>{createdInvites.length > 0 && <div className="inviteResults">{createdInvites.map((invite) => <article key={invite.id}><div><strong>{invite.recipient_email || "Shareable invitation"}</strong><small>Link ready to share</small></div><button type="button" onClick={() => navigator.clipboard.writeText(invite.link)}>Copy link</button><a href={invite.link} target="_blank" rel="noreferrer">Open</a></article>)}</div>}</> : <button className="primaryCta" type="button" onClick={saveEvent} disabled={saveLoading}>{saveLoading ? "Saving event…" : session ? "Save event and continue to invitations" : "Sign in to save this event"} <span>→</span></button>}
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
