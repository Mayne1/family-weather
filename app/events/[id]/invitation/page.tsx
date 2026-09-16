"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getValidSession } from "../../../lib/firebaseAuth";
import SavedInvitationEditor from "../../../components/SavedInvitationEditor";

type EventDetail = { id: string; title: string; description?: string; location?: string; starts_at?: string; ends_at?: string };

export default function InvitationWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [authorization, setAuthorization] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { getValidSession().then(async (session) => {
    if (!session) throw new Error("Sign in to edit this invitation.");
    const auth = `Bearer ${session.idToken}`; setAuthorization(auth);
    const response = await fetch(`/api/events/${id}`, { headers: { Authorization: auth }, cache: "no-store" }); const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Event unavailable."); setEvent(data.event);
  }).catch((reason) => setError(reason instanceof Error ? reason.message : "Event unavailable.")); }, [id]);

  return <main className="eventManagePage"><header className="manageHeader"><Link className="eventsBrand" href="/"><span className="brandMark"><i /><i /><i /></span><span><strong>Family Weather</strong><small>Invitation studio</small></span></Link><Link className="backToEvents" href={`/events/${id}`}>← Event dashboard</Link></header><nav className="eventWorkspaceNav" aria-label="Event workspace"><Link href={`/events/${id}`}>Overview & guests</Link><Link className="active" href={`/events/${id}/invitation`}>Invitation design</Link><Link href={`/events/${id}/package`}>Package</Link></nav>{error ? <section className="eventsEmpty"><h2>We couldn’t open the invitation.</h2><p>{error}</p></section> : !event || !authorization ? <section className="eventsEmpty"><h2>Opening the invitation studio…</h2><p>Your saved event and design are being loaded.</p></section> : <><section className="workspaceIntro"><p className="eyebrow dark"><span /> Invitation design</p><h1>{event.title}</h1><p>Choose the artwork source, finish the design, and save once. Package selection and guest distribution live on their own pages.</p></section><SavedInvitationEditor event={event} authorization={authorization} /><div className="workspaceNext"><Link className="publicPrimary" href={`/events/${id}/package`}>Choose package or continue free <span>→</span></Link></div></>}</main>;
}
