import { zonedLocalToISO } from "../../../backend/event-time";
import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "../../lib/serverConfig";

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") || "";
    if (!authorization.startsWith("Bearer ")) return NextResponse.json({ ok: false, error: "Sign in to see your events." }, { status: 401 });
    const response = await fetch(backendUrl("/events/zoned"), { headers: { Authorization: authorization }, cache: "no-store" });
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
    const zoned = body.starts_local !== undefined || body.time_zone !== undefined;
    if (zoned) {
      try {
        zonedLocalToISO(body.starts_local, body.time_zone);
        if (!Number.isInteger(body.duration_minutes) || body.duration_minutes < 1 || body.duration_minutes > 10080) throw new Error("Choose a duration between one minute and seven days.");
      } catch (error) {
        return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Invalid destination date and time." }, { status: 400 });
      }
    }
    // Zoned creation is atomic in the backend; never fall back to legacy creation.
    const response = await fetch(backendUrl(zoned ? "/events/zoned" : "/events"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authorization },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await response.json();
    const eventId = String(data?.event?.id || data?.id || "");
    if (response.ok && data?.ok && eventId) {
      // Provision Free immediately; failures here must never discard the event the host just created.
      await fetch(backendUrl(`/events/${encodeURIComponent(eventId)}/entitlement`), { headers: { Authorization: authorization }, cache: "no-store" }).catch(() => null);
      await fetch(backendUrl(`/events/${encodeURIComponent(eventId)}/commerce-event`), {
        method: "POST",
        headers: { Authorization: authorization, "Content-Type": "application/json" },
        body: JSON.stringify({ event_name: "event_created" }),
        cache: "no-store",
      }).catch(() => null);
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Event creation failed", error);
    return NextResponse.json({ ok: false, error: "Event service unavailable" }, { status: 502 });
  }
}
