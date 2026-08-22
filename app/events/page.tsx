"use client";

import { useEffect, useState } from "react";
import { loadSession } from "../lib/firebaseAuth";
import type { AuthSession } from "../lib/firebaseAuth";

type FamilyEvent = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  starts_at?: string;
  ends_at?: string;
  created_at?: string;
};

export default function EventsPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const current = loadSession();
    setSession(current);
    if (!current) {
      setLoading(false);
      return;
    }
    fetch("/api/events", { headers: { Authorization: `Bearer ${current.idToken}` }, cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || "Events unavailable");
        setEvents(data.events || []);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Events unavailable"))
      .finally(() => setLoading(false));
  }, []);

  return <main className="eventsPage"><header className="eventsHeader"><a className="eventsBrand" href="/">Family Weather</a><a className="newEventButton" href="/">＋ Create event</a></header><section className="eventsIntro"><p className="eyebrow dark"><span /> Your family plans</p><h1>My events.</h1><p>Everything you save lives here—dates, locations, weather advice and invitations.</p></section>{loading ? <section className="eventsEmpty"><h2>Loading your events…</h2></section> : !session ? <section className="eventsEmpty"><h2>Sign in to see your events.</h2><p>Your events are private to your Family Weather account.</p><a className="newEventButton" href="/">Return home and sign in</a></section> : error ? <section className="eventsEmpty"><h2>We couldn’t load your events.</h2><p>{error}</p></section> : events.length === 0 ? <section className="eventsEmpty"><h2>No events yet.</h2><p>Create your first plan and it will appear here.</p><a className="newEventButton" href="/">Create an event</a></section> : <section className="eventsGrid">{events.map((event) => { const starts = event.starts_at ? new Date(event.starts_at) : null; return <a className="eventCard" href={`/events/${event.id}`} key={event.id}><div className="eventDate"><strong>{starts ? starts.toLocaleDateString("en-US", { month: "short" }).toUpperCase() : "PLAN"}</strong><span>{starts ? starts.getDate() : "—"}</span></div><div><small>EVENT #{event.id}</small><h2>{event.title}</h2><p>{starts ? starts.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Date not set"}</p><p>{event.location || "Location not set"}</p><p className="eventDescription">{event.description || "No additional details."}</p><strong className="openEvent">View event →</strong></div></a>; })}</section>}</main>;
}
