import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "../../../../lib/serverConfig";

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const body = await request.json();
    const responderName = String(body.name || "").trim().slice(0, 160);
    const responseValue = String(body.response || "").trim().toLowerCase();
    if (!responderName) return NextResponse.json({ ok: false, error: "Enter your name." }, { status: 400 });
    if (!new Set(["yes", "maybe", "no"]).has(responseValue)) {
      return NextResponse.json({ ok: false, error: "Choose Going, Maybe, or Can’t go." }, { status: 400 });
    }
    const guestsCount = Math.max(0, Math.min(50, Math.trunc(Number(body.guests_count) || 0)));
    const response = await fetch(backendUrl("/invites/respond"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        response: responseValue,
        responderEmail: String(body.email || "").trim() || null,
        responderName,
        guestsCount,
        message: String(body.message || "").trim().slice(0, 1000) || null,
        responseKey: String(body.response_key || "").trim().slice(0, 100) || null,
      }),
      cache: "no-store",
    });
    const data = await response.json();
    if (data?.error === "share_link_rsvp_limit_reached") return NextResponse.json({ ok: false, error: "This event’s shareable guest list has reached 50 responses." }, { status: 409 });
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("RSVP submission failed", error);
    return NextResponse.json({ ok: false, error: "RSVP service unavailable" }, { status: 502 });
  }
}
