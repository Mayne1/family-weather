import React, { useCallback, useEffect, useState } from "react";
import { apiRequest, authenticate, authHeaders, signOut, type AuthSession } from "./api";

type SwitchTab = (tab: "home" | "plan" | "events" | "announcements" | "account") => void;
type PlanResult = { source: string; location: string; activity: string; score: number | null; bestWindow: string; summary: string; day: { temp_max_f: number; temp_min_f: number; precip_prob_pct: number | null; wind_max_mph: number }; advice?: Array<{ tone: string; title: string; copy: string }> };
export type PlanHandoff = { activity: string; location: string; date: string; space: string; bestWindow: string; summary: string };

export function PlanScreen({ continueWith }: { continueWith: (kind: "event" | "announcement", draft: PlanHandoff) => void }) {
  const [activity, setActivity] = useState("yard work");
  const [location, setLocation] = useState("Stockton, CA");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [space, setSpace] = useState("outdoor");
  const [result, setResult] = useState<PlanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { setResult(await apiRequest<PlanResult>("/api/weather/plan", { method: "POST", data: { activity, location, date, space } })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The plan could not be checked."); }
    finally { setBusy(false); }
  }
  return <div className="nativeScreen"><section className="screenMast planMast"><span className="mastMark">✦</span><div><p className="eyebrow">ACTIVITY WEATHER PLANNER</p><h1>Check a plan.</h1><p>Choose the activity, place, date, and setting. We’ll find the useful weather window.</p></div></section>
    <form className="nativeForm" onSubmit={submit}>
      <label>What are you doing?<input value={activity} onChange={e => setActivity(e.target.value)} required /></label>
      <label>Where?<input value={location} onChange={e => setLocation(e.target.value)} required /></label>
      <label>Date<input type="date" value={date} onChange={e => setDate(e.target.value)} required /></label>
      <div className="segmented">{["indoor", "outdoor", "both"].map(value => <button type="button" className={space === value ? "active" : ""} onClick={() => setSpace(value)} key={value}>{value}</button>)}</div>
      <button className="primaryButton" disabled={busy}>{busy ? "Checking the weather…" : "Check this plan"}<span>→</span></button>
      {error ? <p className="nativeError">{error}</p> : null}
    </form>
    {result ? <section className="nativeResult"><div className="resultTop"><div><p className="eyebrow dark">{result.source === "nws" ? "OFFICIAL NWS FORECAST" : result.source === "almanac" ? "FIVE-YEAR HISTORICAL PATTERN" : "WEATHER FORECAST"}</p><h2>{result.activity} in {result.location}</h2></div><strong>{result.score ?? "—"}<small>{result.score === null ? "NOT SCORED" : "WEATHER FIT"}</small></strong></div><div className="resultGrid"><span><small>BEST WINDOW</small><b>{result.bestWindow}</b></span><span><small>HIGH / LOW</small><b>{result.day.temp_max_f}° / {result.day.temp_min_f}°</b></span><span><small>RAIN</small><b>{result.day.precip_prob_pct ?? "—"}%</b></span><span><small>WIND</small><b>{result.day.wind_max_mph} mph</b></span></div><p>{result.summary}</p>{result.advice?.map(item => <article className={item.tone === "warn" ? "advice warn" : "advice"} key={item.title}><b>{item.tone === "warn" ? "!" : "✓"}</b><span><strong>{item.title}</strong><small>{item.copy}</small></span></article>)}<div className="planNext"><p className="eyebrow dark">BRING PEOPLE INTO THE PLAN</p><h3>What do you want to make?</h3><button className="primaryButton" type="button" onClick={() => continueWith("event", { activity, location: result.location || location, date, space, bestWindow: result.bestWindow, summary: result.summary })}>Create an invitation<span>→</span></button><button className="secondaryAction" type="button" onClick={() => continueWith("announcement", { activity, location: result.location || location, date, space, bestWindow: result.bestWindow, summary: result.summary })}>Create an announcement<span>→</span></button></div></section> : null}
  </div>;
}

type FamilyEvent = { id: string; title: string; description?: string; location?: string; starts_at?: string };
function timeFromWindow(window: string) {
  const match = window.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!match) return "12:00";
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${match[2] || "00"}`;
}

export function EventsScreen({ session, switchTab, draft, clearDraft }: { session: AuthSession | null; switchTab: SwitchTab; draft: PlanHandoff | null; clearDraft: () => void }) {
  const [events, setEvents] = useState<FamilyEvent[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState(""), [shareUrl, setShareUrl] = useState("");
  const [title, setTitle] = useState(draft ? `${draft.activity.charAt(0).toUpperCase()}${draft.activity.slice(1)}` : ""), [eventDate, setEventDate] = useState(draft?.date || new Date().toISOString().slice(0, 10)), [eventTime, setEventTime] = useState(timeFromWindow(draft?.bestWindow || ""));
  const refresh = useCallback(async () => { if (!session) return; setBusy(true); setError(""); try { const data = await apiRequest<{ events: FamilyEvent[] }>("/api/events", { headers: authHeaders(session) }); setEvents(data.events || []); } catch (e) { setError(e instanceof Error ? e.message : "Events unavailable."); } finally { setBusy(false); } }, [session]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (!draft) return; setTitle(`${draft.activity.charAt(0).toUpperCase()}${draft.activity.slice(1)}`); setEventDate(draft.date); setEventTime(timeFromWindow(draft.bestWindow)); setShareUrl(""); setNotice(""); }, [draft]);
  async function createInvitation(event: React.FormEvent) {
    event.preventDefault();
    if (!session || !draft) return;
    setBusy(true); setError(""); setNotice(""); setShareUrl("");
    try {
      const starts = new Date(`${eventDate}T${eventTime}:00`); const ends = new Date(starts.getTime() + 3 * 60 * 60 * 1000);
      const created = await apiRequest<{ event: FamilyEvent }>("/api/events", { method: "POST", headers: authHeaders(session), data: { title, description: `${draft.activity} · ${draft.space} · ${draft.bestWindow}`, location: draft.location, starts_at: starts.toISOString(), ends_at: ends.toISOString() } });
      const eventId = String(created.event?.id || "");
      if (!eventId) throw new Error("The event was saved, but its invitation could not be opened.");
      const invitation = await apiRequest<{ invites: Array<{ link: string }> }>(`/api/events/${encodeURIComponent(eventId)}/invites`, { method: "POST", headers: authHeaders(session), data: { shareable: true } });
      const link = invitation.invites?.[0]?.link || "";
      if (!link) throw new Error("The event was saved, but its share link could not be created.");
      setShareUrl(link); setNotice("Your invitation is ready to share."); clearDraft(); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "The invitation could not be created."); }
    finally { setBusy(false); }
  }
  async function shareInvitation() { if (!shareUrl) return; try { if (navigator.share) await navigator.share({ title, text: `You’re invited to ${title}.`, url: shareUrl }); else { await navigator.clipboard.writeText(shareUrl); setNotice("Invitation link copied."); } } catch { /* Closing the share sheet is harmless. */ } }
  if (!session) return <SignedOut title="Your events" copy="Sign in inside the app to see your saved plans, invitations, and RSVP activity." onPress={() => switchTab("account")} />;
  return <div className="nativeScreen"><section className="screenMast eventsMast"><span className="mastMark">◇</span><div><p className="eyebrow">YOUR FAMILY PLANS</p><h1>My events.</h1><p>Dates, weather advice, invitations, and replies in one place.</p></div><button className="mastAction" onClick={() => void refresh()} disabled={busy}>↻</button></section>{draft ? <form className="nativeForm handoffForm" onSubmit={createInvitation}><p className="eyebrow dark">FROM YOUR WEATHER PLAN</p><h2>Create the invitation.</h2><p>{draft.location} · {draft.bestWindow}</p><label>Event name<input value={title} onChange={e => setTitle(e.target.value)} required /></label><div className="formPair"><label>Date<input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required /></label><label>Start time<input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} required /></label></div><button className="primaryButton" disabled={busy}>{busy ? "Creating invitation…" : "Create my invitation"}<span>→</span></button></form> : null}{error ? <p className="nativeError">{error}</p> : null}{notice ? <p className="nativeNotice">{notice}</p> : null}{shareUrl ? <section className="shareReady"><span>✓</span><div><strong>Invitation ready</strong><small>Choose Messages, Mail, WhatsApp, or any sharing app on your phone.</small></div><button type="button" onClick={() => void shareInvitation()}>Share now ↗</button></section> : null}{busy && !events.length ? <p>Loading your events…</p> : events.length ? <div className="nativeList">{events.map(event => { const starts = event.starts_at ? new Date(event.starts_at) : null; return <article key={event.id}><div className="dateTile"><strong>{starts ? starts.toLocaleDateString("en-US", { month: "short" }) : "PLAN"}</strong><span>{starts?.getDate() || "—"}</span></div><div><small>EVENT</small><h2>{event.title}</h2><p>{starts?.toLocaleString() || "Date not set"}</p><p>{event.location || "Location not set"}</p>{event.description ? <em>{event.description}</em> : null}</div></article>; })}</div> : <Empty title="No events yet." copy="A saved plan will appear here." />}</div>;
}

type Announcement = { id: string; title: string; message: string; theme: string; closed: boolean };
type Reply = { id: string; name: string; message: string; created_at: string };
export function AnnouncementsScreen({ session, switchTab, draft, clearDraft }: { session: AuthSession | null; switchTab: SwitchTab; draft: PlanHandoff | null; clearDraft: () => void }) {
  const [items, setItems] = useState<Announcement[]>([]), [selected, setSelected] = useState<Announcement | null>(null), [replies, setReplies] = useState<Reply[]>([]);
  const [title, setTitle] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const request = useCallback(async (path = "", options: { method?: string; data?: unknown } = {}) => { if (!session) throw new Error("Sign in to manage announcements."); return apiRequest<any>(`/api/announcements${path}`, { ...options, headers: authHeaders(session) }); }, [session]);
  const refresh = useCallback(async () => { if (!session) return; const data = await request(); setItems(data.announcements || []); }, [session, request]);
  useEffect(() => { void refresh().catch(e => setError(e.message)); }, [refresh]);
  useEffect(() => { if (!draft) return; setTitle(`${draft.activity.charAt(0).toUpperCase()}${draft.activity.slice(1)} plan`); setMessage(`${draft.activity} in ${draft.location} on ${new Date(`${draft.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}. Best weather window: ${draft.bestWindow}. ${draft.summary}`); }, [draft]);
  async function view(item: Announcement) { setBusy(true); setError(""); try { const data = await request(`/${item.id}/manage`); setSelected(data.announcement); setReplies(data.replies || []); } catch (e) { setError(e instanceof Error ? e.message : "Could not load replies."); } finally { setBusy(false); } }
  async function create(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError(""); setNotice(""); try { const nextTitle = title, nextMessage = message; const data = await request("", { method: "POST", data: { title: nextTitle, message: nextMessage, theme: "forest" } }); setTitle(""); setMessage(""); clearDraft(); await refresh(); setNotice("Announcement created. Its share link is ready."); const item = { id: data.id, title: nextTitle, message: nextMessage, theme: "forest", closed: false }; await view(item); } catch (e) { setError(e instanceof Error ? e.message : "Could not create announcement."); } finally { setBusy(false); } }
  async function share() { if (!selected) return; const url = `${location.origin}/a/${selected.id}`.replace("capacitor://localhost", "https://thefamilyweather.com"); const data = { title: selected.title, text: `${selected.title}\n\n${selected.message}`, url }; try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(url); setNotice("Announcement link copied."); } } catch { /* A dismissed share sheet is not an error. */ } }
  if (!session) return <SignedOut title="Announcements" copy="Sign in inside the app to create announcements and read replies." onPress={() => switchTab("account")} />;
  return <div className="nativeScreen"><section className="screenMast newsMast"><span className="mastMark">✎</span><div><p className="eyebrow">SHARE A LITTLE NEWS</p><h1>Announcements.</h1><p>Create one beautiful update, share one simple link, and collect replies.</p></div></section><form className="nativeForm" onSubmit={create}><label>Title<input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} required placeholder="A quick family update" /></label><label>Message<textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={4000} required placeholder="What would you like everyone to know?" /></label><button className="primaryButton" disabled={busy}>Create announcement<span>→</span></button></form>{error ? <p className="nativeError">{error}</p> : null}{notice ? <p className="nativeNotice">{notice}</p> : null}<section className="nativePanel"><div className="screenTitleRow"><h2>Your announcements</h2><button onClick={() => void refresh()} disabled={busy}>↻</button></div>{items.length ? items.map(item => <button className="listButton" onClick={() => void view(item)} key={item.id}>{item.title}<span>→</span></button>) : <p>No announcements yet.</p>}</section>{selected ? <section className="nativePanel"><p className="eyebrow dark">SELECTED ANNOUNCEMENT</p><h2>{selected.title}</h2><p>{selected.message}</p><button className="primaryButton" onClick={() => void share()}>Share announcement<span>↗</span></button><h3>Replies · {replies.length}</h3>{replies.length ? replies.map(reply => <article className="reply" key={reply.id}><strong>{reply.name}</strong><p>{reply.message}</p><small>{new Date(reply.created_at).toLocaleString()}</small></article>) : <p>No replies yet.</p>}</section> : null}</div>;
}

export function AccountScreen({ session, setSession }: { session: AuthSession | null; setSession: (session: AuthSession | null) => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin"), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); const data = new FormData(event.currentTarget); try { setSession(await authenticate(mode, String(data.get("email") || "").trim(), String(data.get("password") || ""))); event.currentTarget.reset(); } catch (e) { setError(e instanceof Error ? e.message : "Account access failed."); } finally { setBusy(false); } }
  return <div className="nativeScreen"><section className="screenMast accountMast"><span className="mastMark">○</span><div><p className="eyebrow">FAMILY WEATHER ACCOUNT</p><h1>{session ? "You’re signed in." : mode === "signin" ? "Welcome back." : "Create your account."}</h1><p>Your plans, events, announcements, and replies travel with you.</p></div></section>{session ? <section className="nativePanel accountPanel"><span className="signedInDot">✓</span><p>Signed in as</p><strong>{session.email}</strong><button className="secondaryButton" onClick={() => { signOut(); setSession(null); }}>Sign out</button></section> : <form className="nativeForm" onSubmit={submit}><label>Email address<input name="email" type="email" autoComplete="email" required /></label><label>Password<input name="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={6} required /></label><button className="primaryButton" disabled={busy}>{busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}<span>→</span></button><button className="textButton" type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}>{mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}</button>{error ? <p className="nativeError">{error}</p> : null}</form>}</div>;
}

function SignedOut({ title, copy, onPress }: { title: string; copy: string; onPress: () => void }) { return <div className="nativeScreen"><section className="signedOut"><span>○</span><h1>{title}</h1><p>{copy}</p><button className="primaryButton" onClick={onPress}>Sign in inside the app<span>→</span></button></section></div>; }
function Empty({ title, copy }: { title: string; copy: string }) { return <section className="emptyState"><span>◇</span><h2>{title}</h2><p>{copy}</p></section>; }
