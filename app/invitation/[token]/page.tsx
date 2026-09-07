"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import InvitationCard from "../../invitations/InvitationCard";
import { suggestedInvitationDesign } from "../../invitations/catalog";
import type { InvitationRecord } from "../../invitations/catalog";

type GuestData = {
  valid: boolean;
  event: { title: string; description?: string; location?: string; starts_at?: string };
  invitation?: InvitationRecord | null;
  presentation?: "promoted" | "clean" | "unbranded" | "legacy";
};

export default function GuestInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState("");
  const [data, setData] = useState<GuestData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(({ token: nextToken }) => {
      setToken(nextToken);
      return fetch(`/api/invites/${encodeURIComponent(nextToken)}`, { cache: "no-store" });
    })
      .then(async (response) => {
        const reply = await response.json();
        if (!response.ok || !reply.ok) throw new Error(reply.error || "Invitation not found");
        setData(reply);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Invitation unavailable"));
  }, [params]);

  if (error) return <main className="guestInvitationPage"><section className="guestInvitationState"><span>!</span><h1>We couldn’t open this invitation.</h1><p>{error}</p></section></main>;
  if (!data) return <main className="guestInvitationPage"><section className="guestInvitationState"><span>◌</span><h1>Opening your invitation…</h1></section></main>;
  if (!data.valid) return <main className="guestInvitationPage"><section className="guestInvitationState"><span>×</span><h1>This invitation is no longer active.</h1><p>Ask the organizer for a fresh link.</p></section></main>;

  const invitation = data.invitation || {
    design_id: suggestedInvitationDesign(data.event.description),
    headline: data.event.title,
  };
  const showBranding = data.presentation !== "unbranded";
  const showHeaderBrand = data.presentation === "promoted" || data.presentation === "legacy";

  return (
    <main className="guestInvitationPage">
      {showHeaderBrand ? <Link className="guestInvitationBrand" href="/">Family Weather</Link> : null}
      <InvitationCard invitation={invitation} event={data.event} showBranding={showBranding} />
      <section className="guestInvitationActions">
        <div><small>You’re invited</small><h2>Let the host know if you’ll be there.</h2><p>The RSVP page holds the current event details and records your answer.</p></div>
        <a href={`/rsvp.html?token=${encodeURIComponent(token)}&design=${encodeURIComponent(invitation.design_id)}`}>View details &amp; RSVP <span>→</span></a>
      </section>
      {data.presentation === "promoted" ? <aside className="freeEventPromotion"><div><small>PLANNED WITH FAMILY WEATHER</small><strong>Choose the date. Know the weather. Invite everybody.</strong><span>Create your own weather-smart event free.</span></div><Link href="/">Plan a free event <span>→</span></Link></aside> : null}
    </main>
  );
}
