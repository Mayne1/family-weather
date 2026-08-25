import { NextRequest, NextResponse } from "next/server";

const API = "http://127.0.0.1:3000";
const FIREBASE_API_KEY = "AIzaSyDCZpxyyGJeoIcutk8o_h-96Syo3h8gsv8";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITATION_DESIGNS = new Set(["classic", "birthday", "graduation", "garden", "family", "night", "basic"]);

function parseEmails(value: unknown) {
  const raw = Array.isArray(value) ? value.map(String) : [String(value || "")];
  return [...new Set(
    raw
      .flatMap((item) => item.split(/[\s,;]+/))
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )];
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const authorization = request.headers.get("authorization") || "";
    if (!authorization.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, error: "Sign in before creating invitations." }, { status: 401 });
    }

    const identityResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: authorization.slice(7) }),
      cache: "no-store",
    });
    const identity = await identityResponse.json();
    const signedInEmail = String(identity?.users?.[0]?.email || "").toLowerCase();
    if (!identityResponse.ok || !signedInEmail) {
      return NextResponse.json({ ok: false, error: "Your sign-in expired. Please sign in again." }, { status: 401 });
    }

    const eventResponse = await fetch(`${API}/events/${encodeURIComponent(id)}`, { cache: "no-store" });
    const eventData = await eventResponse.json();
    if (!eventResponse.ok || !eventData.ok) {
      return NextResponse.json(eventData, { status: eventResponse.status });
    }
    if (String(eventData.event?.owner_email || "").toLowerCase() !== signedInEmail) {
      return NextResponse.json({ ok: false, error: "Only the event owner can create invitations." }, { status: 403 });
    }

    const body = await request.json();
    const requestedDesign = String(body.design || "classic").trim().toLowerCase();
    const design = INVITATION_DESIGNS.has(requestedDesign) ? requestedDesign : "classic";
    const shareable = body.shareable === true;
    const emails = parseEmails(body.recipient_emails ?? body.recipient_email);
    if (!shareable && !emails.length) {
      return NextResponse.json({ ok: false, error: "Enter at least one email address." }, { status: 400 });
    }
    if (emails.length > 100) {
      return NextResponse.json({ ok: false, error: "Send no more than 100 invitations in one batch." }, { status: 400 });
    }

    const invalid = emails.filter((email) => !EMAIL_PATTERN.test(email));
    if (invalid.length) {
      return NextResponse.json({
        ok: false,
        error: `Fix these email addresses: ${invalid.slice(0, 5).join(", ")}${invalid.length > 5 ? "…" : ""}`,
      }, { status: 400 });
    }

    const invites = [];
    const failures: { recipient_email: string; error: string }[] = [];
    const forwardedHost = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
      .split(",")[0]
      .trim();
    const forwardedProto = (request.headers.get("x-forwarded-proto") || "https")
      .split(",")[0]
      .trim()
      .toLowerCase();
    const publicHost = /^(?:[a-z0-9-]+\.)?thefamilyweather\.com(?::\d+)?$/i.test(forwardedHost)
      ? forwardedHost
      : "staging.thefamilyweather.com";
    const origin = `${forwardedProto === "http" ? "http" : "https"}://${publicHost}`;

    const recipients: Array<string | null> = shareable ? [null] : emails;
    for (const recipientEmail of recipients) {
      try {
        const response = await fetch(`${API}/invites/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: id,
            inviterEmail: signedInEmail,
            invitedEmail: recipientEmail || undefined,
            expiresHours: 168,
          }),
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          failures.push({ recipient_email: recipientEmail, error: data.error || "Invitation could not be created" });
          continue;
        }
        invites.push({
          id: data.token,
          token: data.token,
          event_id: id,
          delivery: "email",
          recipient_email: recipientEmail || undefined,
          expires_at: data.expiresAt,
          design,
          link: `${origin}/rsvp.html?token=${encodeURIComponent(data.token)}&design=${encodeURIComponent(design)}`,
        });
      } catch (error) {
        failures.push({
          recipient_email: recipientEmail || "Shareable link",
          error: error instanceof Error ? error.message : "Invitation could not be created",
        });
      }
    }

    if (!invites.length) {
      return NextResponse.json({
        ok: false,
        error: failures[0]?.error || "No invitations could be created.",
        failures,
      }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      count: invites.length,
      invites,
      failures,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Invitation service unavailable",
    }, { status: 502 });
  }
}
