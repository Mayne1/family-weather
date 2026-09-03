"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getValidSession } from "../../lib/firebaseAuth";
import EventPurchasePanel from "../../components/EventPurchasePanel";
import SavedInvitationEditor from "../../components/SavedInvitationEditor";
import type { EventEntitlement } from "../../lib/entitlementTypes";

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
  responder_name?: string | null;
  guests_count?: number | null;
  message?: string | null;
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [authorization, setAuthorization] = useState("");
  const [entitlement, setEntitlement] = useState<EventEntitlement | null>(null);
  const [shareLink, setShareLink] = useState("");
  const [canvaNotice, setCanvaNotice] = useState<"complete" | "failed" | "">("");

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("canva");
    if (result === "complete" || result === "failed") setCanvaNotice(result);
  }, []);

  useEffect(() => {
    getValidSession().then((session) => {
      if (!session) throw new Error("Your sign-in expired. Return home and sign in again.");
      const headers = { Authorization: `Bearer ${session.idToken}` };
      setAuthorization(headers.Authorization);
      return Promise.all([
        fetch(`/api/events/${id}`, { headers, cache: "no-store" }),
        fetch(`/api/events/${id}/rsvp-details`, { headers, cache: "no-store" }),
        fetch(`/api/events/${id}/entitlement`, { headers, cache: "no-store" }),
      ]);
    })
      .then(async ([response, detailsResponse, entitlementResponse]) => {
        const [data, detailsData, entitlementData] = await Promise.all([response.json(), detailsResponse.json(), entitlementResponse.json()]);
        if (!response.ok || !data.ok) throw new Error(data.error || "Event unavailable");
        if (!entitlementResponse.ok || !entitlementData.ok) throw new Error(entitlementData.error || "Event purchase information is unavailable.");
        const detailRows: ResponseRow[] = detailsResponse.ok && detailsData.ok ? detailsData.details || [] : data.responses || [];
        setEvent(data.event);
        setResponses(detailRows);
        setEntitlement(entitlementData.entitlement || null);
        setShareLink(entitlementData.entitlement?.share_invitation_url || "");
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

  async function inviteMorePeople(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = formEvent.currentTarget;
    const recipients = String(new FormData(form).get("recipients") || "").trim();
    if (!recipients) return;
    const session = await getValidSession();
    if (!session) return setInviteError("Sign in again before sending invitations.");
    setInviteLoading(true);
    setInviteError("");
    setInviteMessage("");
    try {
      const response = await fetch(`/api/events/${id}/invites`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ recipient_emails: recipients }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Invitations could not be created.");
      const newRows: ResponseRow[] = (data.invites || []).map((invite: { token?: string; id?: string; recipient_email?: string }) => ({
        token: String(invite.token || invite.id),
        invited_email: invite.recipient_email,
        created_at: new Date().toISOString(),
      }));
      setResponses((current) => [...newRows, ...current]);
      setEntitlement((current) => current && current.status === "paid" ? { ...current, email_consumed: current.email_consumed + newRows.length, email_remaining: Math.max(0, current.email_remaining - newRows.length) } : current);
      const failedCount = Array.isArray(data.failures) ? data.failures.length : 0;
      setInviteMessage(`${newRows.length} invitation${newRows.length === 1 ? "" : "s"} created and sent${failedCount ? ` · ${failedCount} could not be sent` : ""}.`);
      form.reset();
    } catch (reason) {
      setInviteError(reason instanceof Error ? reason.message : "Invitations could not be created.");
    } finally {
      setInviteLoading(false);
    }
  }

  async function createShareableLink() {
    const session = await getValidSession();
    if (!session) return setInviteError("Sign in again before creating the shareable link.");
    setInviteLoading(true); setInviteError(""); setInviteMessage("");
    try {
      const response = await fetch(`/api/events/${id}/invites`, { method: "POST", headers: { Authorization: `Bearer ${session.idToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ shareable: true }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Shareable invitation could not be created.");
      const link = String(data.invites?.[0]?.link || ""); setShareLink(link);
      setEntitlement((current) => current ? { ...current, share_invite_token: data.invites?.[0]?.token || null, share_invitation_url: link } : current);
      setInviteMessage("Your shareable invitation link is ready.");
    } catch (reason) { setInviteError(reason instanceof Error ? reason.message : "Shareable invitation could not be created."); }
    finally { setInviteLoading(false); }
  }

  if (loading) return <main className="eventManagePage"><section className="eventsEmpty"><h2>Loading event…</h2></section></main>;
  if (error || !event) return <main className="eventManagePage"><Link className="backToEvents" href="/events">← My events</Link><section className="eventsEmpty"><h2>We couldn’t open this event.</h2><p>{error}</p></section></main>;

  const starts = event.starts_at ? new Date(event.starts_at) : null;
  return <main className="eventManagePage">
    <header className="manageHeader"><Link className="eventsBrand" href="/">Family Weather</Link><Link className="backToEvents" href="/events">← My events</Link></header>
    <section className="eventManageHero"><p className="eyebrow"><span /> Event #{event.id}</p><h1>{event.title}</h1><p>{event.description || "No additional details."}</p><div className="manageFacts"><span>{starts ? starts.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Date not set"}</span><span>{event.location || "Location not set"}</span></div></section>
    {canvaNotice ? <p className={canvaNotice === "complete" ? "canvaReturnNotice success" : "canvaReturnNotice error"}>{canvaNotice === "complete" ? "Your Canva invitation is saved to this event." : "The Canva invitation could not be saved. Your previous invitation artwork is still safe."}</p> : null}
    <section className="responseSummary"><article><strong>{counts.yes}</strong><span>Going</span></article><article><strong>{counts.maybe}</strong><span>Maybe</span></article><article><strong>{counts.no}</strong><span>Can’t go</span></article><article><strong>{counts.waiting}</strong><span>Waiting</span></article></section>
    <SavedInvitationEditor event={event} authorization={authorization} />
    {!entitlement || entitlement.status === "pending" ? <EventPurchasePanel eventId={id} authorization={authorization} entitlement={entitlement} /> : null}
    {entitlement && (entitlement.status === "paid" || entitlement.status === "legacy") ? <section className="guestPanel"><div><p className="eyebrow dark"><span /> Invitations</p><h2>{entitlement.distribution_method === "share_link" ? "Share your invitation." : "Invite more people."}</h2><p className="panelIntro">{entitlement.distribution_method === "share_link" ? "Use your own email, Messages, social media, or other communication tools to distribute one Family Weather invitation link." : "Add recipients whenever the guest list grows. They will receive the invitation already saved for this event."}</p></div>
      {(entitlement.distribution_method === "email" || entitlement.status === "legacy") ? <><p className="entitlementUsage">{entitlement.status === "legacy" ? "Existing event access" : `${entitlement.email_remaining} of ${entitlement.email_limit} Family Weather email invitations remaining`}</p><form className="inviteMoreForm" onSubmit={inviteMorePeople}><label className="formField"><span>Email addresses</span><textarea name="recipients" required rows={4} placeholder={"maya@example.com, jordan@example.com\nterry@example.com"} /></label><button className="primaryCta" type="submit" disabled={inviteLoading || (entitlement.status === "paid" && entitlement.email_remaining === 0)}>{inviteLoading ? "Sending invitations…" : entitlement.status === "paid" && entitlement.email_remaining === 0 ? "Email allowance used" : "Send invitations"}<span>→</span></button></form></> : null}
      {(entitlement.distribution_method === "share_link" || entitlement.status === "legacy") ? <div className="shareDistribution"><p className="entitlementUsage">{entitlement.status === "legacy" ? "Existing event access" : `${entitlement.share_rsvp_count} of ${entitlement.share_rsvp_limit} guest RSVPs received`}</p>{shareLink ? <div className="shareLinkReady"><input aria-label="Shareable invitation link" readOnly value={shareLink} /><button type="button" onClick={() => navigator.clipboard.writeText(shareLink)}>Copy link</button><a href={shareLink} target="_blank" rel="noreferrer">Open</a></div> : <button className="primaryCta" type="button" onClick={createShareableLink} disabled={inviteLoading}>{inviteLoading ? "Creating link…" : "Create my shareable invitation link"}<span>→</span></button>}</div> : null}
      {inviteMessage ? <p className="inviteSuccess" role="status">{inviteMessage}</p> : null}{inviteError ? <p className="formError" role="alert">{inviteError}</p> : null}<div className="guestResponsesHeading"><h3>Guest responses</h3><span>{responses.length} response{responses.length === 1 ? "" : "s"}</span></div>{responses.length === 0 ? <p className="noResponses">No guest responses yet.</p> : <div className="guestList">{responses.map((row) => <article key={row.token}><div><strong>{row.responder_name || row.invited_email || "Shareable invitation"}</strong><small>{row.responded_at ? `Answered ${new Date(row.responded_at).toLocaleString()}${row.guests_count ? ` · ${row.guests_count} additional guest${row.guests_count === 1 ? "" : "s"}` : ""}` : row.opened_at ? "Opened—waiting for an answer" : "Not opened yet"}</small>{row.message ? <small className="guestMessage">“{row.message}”</small> : null}</div><span className={`responseBadge ${row.response || "waiting"}`}>{row.response === "yes" ? "Going" : row.response === "maybe" ? "Maybe" : row.response === "no" ? "Can’t go" : "Waiting"}</span></article>)}</div>}</section> : null}
    <section className="dangerZone"><div><h2>Delete this event</h2><p>Removes the event, its private links and all RSVP answers.</p></div><button type="button" onClick={deleteEvent} disabled={deleting}>{deleting ? "Deleting…" : "Delete event"}</button></section>
  </main>;
}
