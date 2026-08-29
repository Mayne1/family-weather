import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "../../../../lib/serverConfig";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "Sign in to view RSVP details." }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const response = await fetch(backendUrl(`/events/${encodeURIComponent(id)}/rsvp-details`), {
      headers: { Authorization: authorization },
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("RSVP detail lookup failed", error);
    return NextResponse.json({ ok: false, error: "RSVP details unavailable" }, { status: 502 });
  }
}
