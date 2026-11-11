"use client";

import GuestAffiliatePromotion from "../components/GuestAffiliatePromotion";
import { supportsEventAffiliate } from "../lib/affiliatePromotions";

import { formatEventDateTime } from "../lib/eventTime";

import { Suspense, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type InviteData = {
  valid: boolean;
  accepted: boolean;
  invite: { status: string };
  event: { title: string; description: string; location: string; starts_at: string; time_zone?: string | null; ends_at: string };
  invitation?: { design_id?: string } | null;
  presentation?: "promoted" | "clean" | "unbranded" | "legacy";
};

const invitationThemes = {
  baby: { kicker: "A little one is on the way", mark: "☾", note: "Join us in showering this growing family with love." },
  reunion: { kicker: "Together again", mark: "♡", note: "Come reconnect, laugh, eat, and make another family memory." },
  cookout: { kicker: "Pull up a chair", mark: "♨", note: "Good food, open air, and good people are waiting." },
  classic: { kicker: "You’re warmly invited", mark: "✦", note: "A plan made for the people who matter." },
  birthday: { kicker: "Come celebrate", mark: "🎂", note: "Another trip around the sun deserves good company." },
  graduation: { kicker: "A proud moment", mark: "🎓", note: "Join us as we celebrate what comes next." },
  garden: { kicker: "Gather with us", mark: "❀", note: "Good weather, good people, and time together." },
  family: { kicker: "Family time", mark: "♡", note: "The best plans are the ones that bring us together." },
  night: { kicker: "Save the evening", mark: "✧", note: "Meet us after dark for something worth remembering." },
  basic: { kicker: "You’re invited", mark: "→", note: "Here are the details for the plan." },
} as const;

type InvitationDesign = keyof typeof invitationThemes;

function validDesign(value: string | null): InvitationDesign {
  if (value && value in invitationThemes) return value as InvitationDesign;
  if (value?.startsWith("wedding-")) return value.includes("midnight") || value.includes("noir") ? "night" : "garden";
  if (value === "graduation-ascent") return "graduation";
  if (value === "baby-botanical") return "baby";
  if (value === "cookout-table") return "cookout";
  if (value === "park-paper") return "garden";
  if (value === "birthday-after-dark") return "birthday";
  return "basic";
}

export default function RsvpPage() {
  return <Suspense fallback={<main className="rsvpPage"><p>Opening your invitation…</p></main>}><RsvpRouter /></Suspense>;
}

function RsvpRouter() {
  const queryString = useSearchParams().toString();
  return <RsvpContent key={queryString} queryString={queryString} />;
}

function RsvpContent({ queryString }: { queryString: string }) {
  const token = new URLSearchParams(queryString).get("token") || "";
  const submission = useRef<AbortController | null>(null);
  useEffect(() => () => { submission.current?.abort(); }, []);
  const [resolvedQuery, setResolvedQuery] = useState<string | null>(null);
  const [design, setDesign] = useState<InvitationDesign>("basic");
  const [data, setData] = useState<InviteData | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [answer, setAnswer] = useState("");
  const [showRsvp, setShowRsvp] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const query = new URLSearchParams(queryString);
    const nextToken = query.get("token") || "";
    setDesign(validDesign(query.get("design")));
    if (!nextToken) {
      setError("This invitation link is missing its token.");
      setResolvedQuery(queryString);
      return;
    }
    fetch(`/api/invites/${encodeURIComponent(nextToken)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const reply = await response.json();
        if (!response.ok || !reply.ok) throw new Error(reply.error || "Invitation not found");
        if (!active) return;
        setData(reply);
        setResolvedQuery(queryString);
        if (!query.get("design")) setDesign(validDesign(reply.invitation?.design_id || null));
      })
      .catch((reason) => { if (active) { setError(reason instanceof Error ? reason.message : "Invitation unavailable"); setResolvedQuery(queryString); } });
    return () => { active = false; controller.abort(); };
  }, [queryString]);

  const respond = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const responseStorageKey = `family-weather-rsvp-${token}`;
    const savedResponseKey = localStorage.getItem(responseStorageKey) || "";
    if (submission.current && !submission.current.signal.aborted) return;
    const controller = new AbortController();
    submission.current = controller;
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/invites/${encodeURIComponent(token)}/rsvp`, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, response_key: savedResponseKey }),
      });
      const reply = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok || !reply.ok) throw new Error(reply.error || "RSVP could not be saved");
      if (reply.responseKey) localStorage.setItem(responseStorageKey, String(reply.responseKey));
      setAnswer(String(values.response || "yes"));
    } catch (reason) {
      if (controller.signal.aborted) return;
      setError(reason instanceof Error ? reason.message : "RSVP could not be saved");
    } finally {
      if (!controller.signal.aborted) { submission.current = null; setSending(false); }
    }
  };

  if (resolvedQuery !== queryString) return <main className="rsvpPage"><p>Opening your invitation…</p></main>;

  const theme = invitationThemes[design];
  const when = formatEventDateTime(data?.event?.starts_at, data?.event?.time_zone);

  return (
    <main className={`rsvpPage rsvpTheme-${design}`}>
      <section className="rsvpCard rsvpInvitationCard">
        {data?.presentation !== "unbranded" ? <Link className="rsvpBrand" href="/">Family Weather</Link> : null}
        {error ? (
          <div className="rsvpState"><span>!</span><h1>We couldn’t open this invitation.</h1><p>{error}</p></div>
        ) : !data ? (
          <div className="rsvpState"><span>◌</span><h1>Opening your invitation…</h1></div>
        ) : !data.valid ? (
          <div className="rsvpState"><span>×</span><h1>This invitation is no longer active.</h1><p>Ask the event organizer for a fresh link.</p></div>
        ) : answer ? (
          <div className="rsvpState success"><span>✓</span><h1>Your answer is in.</h1><p>You responded <strong>{answer === "yes" ? "Going" : answer === "maybe" ? "Maybe" : "Can’t go"}</strong> to {data.event.title}.</p></div>
        ) : (
          <>
            <article className={`invitationCover invitation-${design}`}>
              <div className="invitationFrame">
                <span className="invitationMark" aria-hidden="true">{theme.mark}</span>
                <p className="invitationKicker">{theme.kicker}</p>
                <h1>{data.event.title}</h1>
                <p className="invitationNote">{theme.note}</p>
                <div className="invitationSummary">
                  <p><span>When</span><strong>{when}</strong></p>
                  <p><span>Where</span><strong>{data.event.location || "Location to be announced"}</strong></p>
                </div>
                <button className="invitationAction" type="button" onClick={() => setShowRsvp(true)}>{showRsvp ? "RSVP form is open below" : "View details & RSVP"}<span>↓</span></button>
              </div>
            </article>
            {showRsvp && (
              <section className="rsvpDetails" aria-labelledby="rsvp-heading">
                <p className="eyebrow dark"><span /> Event details</p>
                <h2 id="rsvp-heading">Will you be there?</h2>
                <dl className="eventFacts">
                  <div><dt>WHEN</dt><dd>{when}</dd></div>
                  <div><dt>WHERE</dt><dd>{data.event.location || "Location to be announced"}</dd></div>
                  <div><dt>DETAILS</dt><dd>{data.event.description || "A family plan is waiting for you."}</dd></div>
                </dl>
                <form className="rsvpForm" onSubmit={respond}>
                  <label className="formField"><span>Your name</span><input name="name" required /></label>
                  <label className="formField"><span>Email address (optional)</span><input name="email" type="email" /></label>
                  <label className="formField"><span>Guests coming with you</span><input name="guests_count" type="number" min="0" defaultValue="0" /></label>
                  <fieldset><legend>Your answer</legend><div><label><input type="radio" name="response" value="yes" required /> Going</label><label><input type="radio" name="response" value="maybe" /> Maybe</label><label><input type="radio" name="response" value="no" /> Can’t go</label></div></fieldset>
                  <label className="formField"><span>Message (optional)</span><input name="message" placeholder="Anything the organizer should know" /></label>
                  <button className="primaryCta" disabled={sending}>{sending ? "Saving your answer…" : "Send my RSVP"}<span>→</span></button>
                </form>
              </section>
            )}
          </>
        )}
      </section>
      {supportsEventAffiliate(data?.presentation, data?.valid === true, Boolean(error)) ? <GuestAffiliatePromotion key={token} token={token} /> : null}
    </main>
  );
}
