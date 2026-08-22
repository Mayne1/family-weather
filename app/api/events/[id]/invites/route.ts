import { NextRequest, NextResponse } from "next/server";

const API = "http://127.0.0.1:3000";
const FIREBASE_API_KEY = "AIzaSyDCZpxyyGJeoIcutk8o_h-96Syo3h8gsv8";

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
    const response = await fetch(`${API}/events/${encodeURIComponent(id)}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, delivery: "email", recipient_phone: null, base_url: "https://staging.thefamilyweather.com" }),
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Invitation service unavailable" }, { status: 502 });
  }
}
