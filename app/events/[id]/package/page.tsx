"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getValidSession } from "../../../lib/firebaseAuth";
import EventPurchasePanel from "../../../components/EventPurchasePanel";
import type { EventEntitlement } from "../../../lib/entitlementTypes";

export default function EventPackagePage() {
  const { id } = useParams<{ id: string }>();
  const [authorization, setAuthorization] = useState("");
  const [entitlement, setEntitlement] = useState<EventEntitlement | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { getValidSession().then(async (session) => { if (!session) throw new Error("Sign in to open this event package."); const auth = `Bearer ${session.idToken}`; setAuthorization(auth); const response = await fetch(`/api/events/${id}/entitlement`, { headers: { Authorization: auth }, cache: "no-store" }); const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error || "Package information is unavailable."); setEntitlement(data.entitlement); }).catch((reason) => setError(reason instanceof Error ? reason.message : "Package information is unavailable.")); }, [id]);
  return <main className="eventManagePage"><header className="manageHeader"><Link className="eventsBrand" href="/"><span className="brandMark"><i /><i /><i /></span><span><strong>Family Weather</strong><small>Event package</small></span></Link><Link className="backToEvents" href={`/events/${id}`}>← Event dashboard</Link></header><nav className="eventWorkspaceNav" aria-label="Event workspace"><Link href={`/events/${id}`}>Overview & guests</Link><Link href={`/events/${id}/invitation`}>Invitation design</Link><Link className="active" href={`/events/${id}/package`}>Package</Link></nav><section className="workspaceIntro"><p className="eyebrow dark"><span /> Package</p><h1>Choose only what this event needs.</h1><p>The free event remains available. Upgrades apply to this event rather than starting a subscription.</p></section>{error ? <p className="eventsPageError">{error}</p> : entitlement && authorization ? <EventPurchasePanel eventId={id} authorization={authorization} entitlement={entitlement} continueHref={`/events/${id}`} /> : <section className="eventsEmpty"><h2>Loading package choices…</h2></section>}</main>;
}
