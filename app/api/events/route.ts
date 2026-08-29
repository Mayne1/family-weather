import { NextRequest, NextResponse } from "next/server";
import { backendUrl, firebaseApiKey } from "../../lib/serverConfig";

async function signedInEmail(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return "";
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: authorization.slice(7) }),
    cache: "no-store",
  });
  const data = await response.json();
  return response.ok ? String(data?.users?.[0]?.email || "") : "";
}

export async function GET(request: NextRequest) {
  try {
    const email = await signedInEmail(request);
    if (!email) return NextResponse.json({ ok: false, error: "Sign in to see your events." }, { status: 401 });
    const response = await fetch(backendUrl(`/events?owner_email=${encodeURIComponent(email)}&limit=100`), { cache: "no-store" });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Events lookup failed", error);
    return NextResponse.json({ ok: false, error: "Events unavailable" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "Sign in before saving this event." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const response = await fetch(backendUrl("/events"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authorization },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Event creation failed", error);
    return NextResponse.json({ ok: false, error: "Event service unavailable" }, { status: 502 });
  }
}
