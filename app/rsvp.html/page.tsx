"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type InviteData = {
  valid: boolean;
  accepted: boolean;
  invite: { status: string };
  event: { title: string; description: string; location: string; starts_at: string; ends_at: string; owner_email: string };
};

export default function RsvpPage() {
  const [token, setToken] = useState("");
  const [data, setData] = useState<InviteData | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    const nextToken = new URLSearchParams(window.location.search).get("token") || "";
    setToken(nextToken);
    if (!nextToken) {
      setError("This invitation link is missing its token.");
      return;
    }
    fetch(`/api/invites/${encodeURIComponent(nextToken)}`, { cache: "no-store" })
      .then(async (response) => {
        const reply = await response.json();
        if (!response.ok || !reply.ok) throw new Error(reply.error || "Invitation not found");
        setData(reply);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Invitation unavailable"));
  }, []);

  const respond = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/invites/${encodeURIComponent(token)}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const reply = await response.json();
      if (!response.ok || !reply.ok) throw new Error(reply.error || "RSVP could not be saved");
      setAnswer(String(values.response || "yes"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "RSVP could not be saved");
    } finally {
      setSending(false);
    }
  };

  const when = data?.event?.starts_at ? new Date(data.event.starts_at).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" }) : "";

  return <main className="rsvpPage"><section className="rsvpCard"><a className="rsvpBrand" href="/">Family Weather</a>{error ? <div className="rsvpState"><span>!</span><h1>We couldn’t open this invitation.</h1><p>{error}</p></div> : !data ? <div className="rsvpState"><span>◌</span><h1>Opening your invitation…</h1></div> : !data.valid ? <div className="rsvpState"><span>×</span><h1>This invitation is no longer active.</h1><p>Ask the event organizer for a fresh link.</p></div> : answer ? <div className="rsvpState success"><span>✓</span><h1>Your answer is in.</h1><p>You responded <strong>{answer === "yes" ? "Going" : answer === "maybe" ? "Maybe" : "Can’t go"}</strong> to {data.event.title}.</p></div> : <><p className="eyebrow dark"><span /> You’re invited</p><h1>{data.event.title}</h1><dl className="eventFacts"><div><dt>WHEN</dt><dd>{when}</dd></div><div><dt>WHERE</dt><dd>{data.event.location || "Location to be announced"}</dd></div><div><dt>DETAILS</dt><dd>{data.event.description || "A family plan is waiting for you."}</dd></div></dl><form className="rsvpForm" onSubmit={respond}><label className="formField"><span>Your name</span><input name="name" required /></label><label className="formField"><span>Email address (optional)</span><input name="email" type="email" /></label><label className="formField"><span>Guests coming with you</span><input name="guests_count" type="number" min="0" defaultValue="0" /></label><fieldset><legend>Your answer</legend><div><label><input type="radio" name="response" value="yes" required /> Going</label><label><input type="radio" name="response" value="maybe" /> Maybe</label><label><input type="radio" name="response" value="no" /> Can’t go</label></div></fieldset><label className="formField"><span>Message (optional)</span><input name="message" placeholder="Anything the organizer should know" /></label><button className="primaryCta" disabled={sending}>{sending ? "Saving your answer…" : "Send my RSVP"}<span>→</span></button></form></>}</section></main>;
}
