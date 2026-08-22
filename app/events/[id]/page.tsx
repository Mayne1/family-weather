"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getValidSession } from "../../lib/firebaseAuth";

type EventDetail = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  starts_at?: string;
  ends_at?: string;
};

type ResponseRow = {
  token: string;
  invited_email?: string;
  created_at?: string;
  opened_at?: string;
  responded_at?: string;
  response?: "yes" | "maybe" | "no" | null;
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getValidSession().then((session) => {
      if (!session) throw new Error("Your sign-in expired. Return home and sign in again.");
      return fetch(`/api/events/${id}`, { headers: { Authorization: `Bearer ${session.idToken}` }, cache: "no-store" });
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || "Event unavailable");
        setEvent(data.event);
        setResponses(data.responses || []);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Event unavailable"))
      .finally(() => setLoading(false));
  }, [id]);

  const counts = useMemo(() => ({
    yes: responses.filter((row) => row.response === "yes").length,
    maybe: responses.filter((row) => row.response === "maybe").length,
    no: responses.filter((row) => row.response === "no").length,
    waiting: responses.filter((row) => !row.response).length,
  }), [responses]);

  async function deleteEvent() {
    if (!event || !window.confirm(`Delete “${event.title}”? This also removes its invitations and RSVP answers.`)) return;
    const session = await getValidSession();
    if (!session) return setError("Sign in again before deleting.");
    setDeleting(true);
    const response = await fetch(`/api/events/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${session.idToken}` } });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      setError(data.error || "Could not delete event");
      setDeleting(false);
      return;
    }
    router.push("/events");
    router.refresh();
  }

  if (loading) return <main className="eventManagePage"><section className="eventsEmpty"><h2>Loading event…</h2></section></main>;
  if (error || !event) return <main className="eventManagePage"><a className="backToEvents" href="/events">← My events</a><section className="eventsEmpty"><h2>We couldn’t open this event.</h2><p>{error}</p></section></main>;

  const starts = event.starts_at ? new Date(event.starts_at) : null;
  return <main className="eventManagePage">
    <header className="manageHeader"><a className="eventsBrand" href="/">Family Weather</a><a className="backToEvents" href="/events">← My events</a></header>
    <section className="eventManageHero"><p className="eyebrow"><span /> Event #{event.id}</p><h1>{event.title}</h1><p>{event.description || "No additional details."}</p><div className="manageFacts"><span>{starts ? starts.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Date not set"}</span><span>{event.location || "Location not set"}</span></div></section>
    <section className="responseSummary"><article><strong>{counts.yes}</strong><span>Going</span></article><article><strong>{counts.maybe}</strong><span>Maybe</span></article><article><strong>{counts.no}</strong><span>Can’t go</span></article><article><strong>{counts.waiting}</strong><span>Waiting</span></article></section>
    <section className="guestPanel"><div><p className="eyebrow dark"><span /> Invitations</p><h2>Who answered?</h2></div>{responses.length === 0 ? <p className="noResponses">No invitations have been created for this event yet.</p> : <div className="guestList">{responses.map((row) => <article key={row.token}><div><strong>{row.invited_email || "Shareable invitation"}</strong><small>{row.responded_at ? `Answered ${new Date(row.responded_at).toLocaleString()}` : row.opened_at ? "Opened—waiting for an answer" : "Not opened yet"}</small></div><span className={`responseBadge ${row.response || "waiting"}`}>{row.response === "yes" ? "Going" : row.response === "maybe" ? "Maybe" : row.response === "no" ? "Can’t go" : "Waiting"}</span></article>)}</div>}</section>
    <section className="dangerZone"><div><h2>Delete this test event</h2><p>Removes the event, its private links and all RSVP answers.</p></div><button type="button" onClick={deleteEvent} disabled={deleting}>{deleting ? "Deleting…" : "Delete event"}</button></section>
  </main>;
}
