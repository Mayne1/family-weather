import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "../../../../lib/serverConfig";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "Sign in to view this event location." }, { status: 401 });
  }
  try {
    const response = await fetch(backendUrl(`/events/${encodeURIComponent(id)}/location`), {
      headers: { Authorization: authorization },
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Event location lookup failed", error);
    return NextResponse.json({ ok: false, error: "Event location unavailable" }, { status: 502 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "Sign in to update this event location." }, { status: 401 });
  }
  try {
    const response = await fetch(backendUrl(`/events/${encodeURIComponent(id)}/location`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: authorization },
      body: await request.text(),
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Event location update failed", error);
    return NextResponse.json({ ok: false, error: "Event location unavailable" }, { status: 502 });
  }
}
