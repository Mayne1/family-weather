"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import LocationSearchInput from "../components/LocationSearchInput";
import { getValidSession, sendPasswordReset, signIn, signUp } from "../lib/firebaseAuth";
import type { AuthSession } from "../lib/firebaseAuth";
import type { LocationCandidate } from "../lib/location";
import DecisionEyeMark from "../components/DecisionEyeMark";
import { recommendedStartTime } from "../lib/plannerWindow";
import { weatherScoreCaption } from "../lib/weatherReview";

type EventDraft = { name: string; activity: string; guests: string; location: string; date: string; time: string };
type Plan = { time_zone?: string | null; source: string; location: string; resolvedLocation: LocationCandidate; score: number | null; bestWindow: string; space: string; activity: string; advice: Array<{ tone: string; title: string; copy: string }>; decision?: { status?: "recommended" | "caution" | "avoid" | "insufficient-data" | "historical-only" } };

export default function CreateEventFlow({ initialActivity, initialLocation, initialDate, initialWindow, initialTime }: { initialActivity: string; initialLocation: string; initialDate: string; initialWindow: string; initialTime: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "review" | "account">("details");
  const [activity, setActivity] = useState(initialActivity || "family gathering");
  const [location, setLocation] = useState(initialLocation);
  const [date, setDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(recommendedStartTime(`2000-01-01T${initialTime}:00`, initialWindow) || "12:00");
  const [space, setSpace] = useState("outdoor");
  const [resolved, setResolved] = useState<LocationCandidate | null>(null);
  const [suggestions, setSuggestions] = useState<LocationCandidate[]>([]);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup" | "reset">("signin");
  const [authNotice, setAuthNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { getValidSession().then(setSession); }, []);

  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setAuthNotice("");
    const values = new FormData(event.currentTarget);
    const nextDraft = { name: String(values.get("name") || "Family event"), activity, guests: String(values.get("guests") || ""), location, date, time };
    try {
      const response = await fetch("/api/weather/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activity, location, resolvedLocation: resolved, date, time, space }) });
      const data = await response.json();
      if (!response.ok || !data.ok) { if (response.status === 409) setSuggestions(data.suggestions || []); throw new Error(data.error || "The weather could not be checked."); }
      setResolved(data.resolvedLocation); setLocation(data.resolvedLocation?.label || location); setDraft({ ...nextDraft, location: data.resolvedLocation?.label || location }); setPlan(data); setStep("review");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The weather could not be checked."); }
    finally { setLoading(false); }
  }

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const values = new FormData(event.currentTarget);
    try {
      const email = String(values.get("email") || "").trim();
      if (authMode === "reset") {
        await sendPasswordReset(email);
        setAuthNotice("If an account uses that address, Firebase has sent its password-reset email. Your event details are still here.");
        return;
      }
      const password = String(values.get("password") || "");
      const next = authMode === "signin" ? await signIn(email, password) : await signUp(email, password);
      setSession(next); setStep("review");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Account access failed."); }
    finally { setLoading(false); }
  }

  async function save() {
    const active = await getValidSession();
    if (!active) { setSession(null); setStep("account"); return; }
    if (!draft || !plan) return;
    setLoading(true); setError("");
    try {
      if (!plan.time_zone) throw new Error("The destination time zone could not be confirmed. Review the weather again before saving.");
      const response = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${active.idToken}` }, body: JSON.stringify({ title: draft.name, description: `${draft.activity} · ${space}`, location: draft.location, starts_local: `${draft.date}T${draft.time || "12:00"}:00`, time_zone: plan.time_zone, duration_minutes: 180 }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "The event could not be saved.");
      if (resolved) {
        const locationResponse = await fetch(`/api/events/${encodeURIComponent(data.event.id)}/location`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${active.idToken}` }, body: JSON.stringify(resolved) });
        const locationData = await locationResponse.json();
        if (!locationResponse.ok || !locationData.ok) throw new Error(locationData.error || "The event was saved, but its location could not be attached.");
      }
      router.push(`/events/${encodeURIComponent(data.event.id)}/invitation`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The event could not be saved."); setLoading(false); }
  }

  const planIsHistorical = plan?.source === "almanac";
  const planDataIncomplete = plan?.decision?.status === "insufficient-data";

  return <section className="createEventWorkspace"><ol className="workflowProgress"><li className={step === "details" ? "active" : "done"}><span>1</span>Event details</li><li className={step === "review" ? "active" : step === "account" ? "done" : ""}><span>2</span>Weather review</li><li className={step === "account" ? "active" : ""}><span>3</span>Save event</li><li><span>4</span>Invitation design</li></ol>
    {step === "details" ? <form className="workflowCard" onSubmit={review}><h2>Tell us what you are planning.</h2><p>These details create the event. The invitation design comes next on its own page.</p><div className="formGrid"><label className="formField full"><span>Event name</span><input name="name" required placeholder="Johnson family cookout" /></label><label className="formField"><span>Activity</span><input value={activity} onChange={(event) => setActivity(event.target.value)} required /></label><label className="formField"><span>Expected guests</span><input name="guests" type="number" min="1" defaultValue="12" /></label><label className="formField full"><span>Address, venue, landmark, or city</span><LocationSearchInput id="create-event-location" required value={location} forcedSuggestions={suggestions} onChange={(value) => { setLocation(value); setResolved(null); setSuggestions([]); }} onSelect={(candidate) => { setLocation(candidate.label); setResolved(candidate); setSuggestions([]); }} /></label><label className="formField"><span>Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label><label className="formField"><span>Start time</span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} required />{initialWindow && recommendedStartTime(`2000-01-01T${initialTime}:00`, initialWindow) ? <small className="fieldHint">Planner window: {initialWindow}. The start time begins inside that window.</small> : null}</label></div><fieldset className="spaceChoice"><legend>Where will people spend their time?</legend><div>{[["indoor", "⌂", "Indoor", "Travel weather matters."], ["outdoor", "☀", "Outdoor", "Exposure matters most."], ["both", "◐", "Both", "Check both settings."]].map(([value, icon, title, copy]) => <button key={value} type="button" className={space === value ? "active" : ""} onClick={() => setSpace(value)}><b>{icon}</b><span><strong>{title}</strong><small>{copy}</small></span></button>)}</div></fieldset><button className="primaryCta" disabled={loading}>{loading ? "Checking real weather…" : "Review the weather fit"}<span>→</span></button>{error ? <p className="formError">{error}</p> : null}</form> : null}
    {step === "review" && plan && draft ? <section className="workflowCard weatherReviewCard"><button className="backButton" type="button" onClick={() => setStep("details")}>← Edit event details</button><p className="publicKicker">Weather review</p><h2>{planDataIncomplete ? "Weather data is incomplete—not bad." : planIsHistorical ? "Historical pattern for your event date." : plan.score !== null && plan.score >= 80 ? "This plan has a strong weather window." : plan.score !== null && plan.score >= 60 ? "This plan can work with preparation." : "This plan needs a backup."}</h2><p>{draft.name} · {draft.location} · {new Date(`${draft.date}T${draft.time}:00Z`).toLocaleString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })} ({plan.time_zone || "destination time zone unavailable"})</p>{planDataIncomplete ? <div className="plannerDataAlert" role="status"><strong>No weather verdict was issued.</strong><p>You can still save the event, but check again before relying on the weather.</p></div> : null}<div className="reviewScore"><div><small>{planDataIncomplete ? "DATA STATUS" : planIsHistorical && plan.score !== null ? "HISTORICAL FIT" : "WEATHER FIT"}</small><strong>{planDataIncomplete ? "?" : plan.score ?? "—"}</strong><span>{weatherScoreCaption(plan.source, plan.score, planDataIncomplete)}</span></div><div><small>BEST WINDOW</small><strong>{plan.bestWindow}</strong><span>{plan.source.toUpperCase()} planning basis</span></div></div><div className="adviceList">{plan.advice?.map((item) => <article key={item.title} className={`${item.tone === "warn" ? "warning" : ""}${item.title === "The Eye says" ? " eyeGuidance" : ""}`}><span>{item.title === "The Eye says" ? <DecisionEyeMark /> : item.tone === "warn" ? "!" : "✓"}</span><div><strong>{item.title}</strong><p>{item.copy}</p></div></article>)}</div><button className="primaryCta" type="button" onClick={save} disabled={loading}>{loading ? "Saving event…" : session ? "Save event and design invitation" : "Sign in to save and continue"}<span>→</span></button>{error ? <p className="formError">{error}</p> : null}</section> : null}
    {step === "account" ? <form className="workflowCard accountCard" onSubmit={authenticate}><button className="backButton" type="button" onClick={() => setStep("review")}>← Back to weather review</button><p className="publicKicker">Family Weather account</p><h2>{authMode === "signin" ? "Sign in to save the event." : authMode === "signup" ? "Create an account to save the event." : "Reset your password."}</h2><p>{authMode === "reset" ? "Enter your account email. Firebase will send the secure reset link, and your event details will remain in place." : "The event details and weather review remain in place while you sign in."}</p><label className="formField"><span>Email address</span><input name="email" type="email" required autoComplete="email" /></label>{authMode !== "reset" ? <label className="formField"><span>Password</span><input name="password" type="password" required minLength={authMode === "signup" ? 6 : undefined} autoComplete={authMode === "signin" ? "current-password" : "new-password"} /></label> : null}{authNotice ? <p className="authNotice" role="status">{authNotice}</p> : null}<button className="primaryCta" disabled={loading}>{loading ? "One moment…" : authMode === "signin" ? "Sign in and continue" : authMode === "signup" ? "Create account and continue" : "Send reset email"}<span>→</span></button>{authMode === "signin" ? <button className="forgotPassword" type="button" onClick={() => { setAuthMode("reset"); setError(""); setAuthNotice(""); }}>Forgot password?</button> : null}<button className="authSwitch" type="button" onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setError(""); setAuthNotice(""); }}>{authMode === "signin" ? "New here? Create an account" : authMode === "signup" ? "Already have an account? Sign in" : "Back to sign in"}</button>{error ? <p className="formError">{error}</p> : null}</form> : null}
  </section>;
}
