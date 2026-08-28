import { NextRequest, NextResponse } from "next/server";

const API = "http://127.0.0.1:3000";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const response = await fetch(`${API}/events/${encodeURIComponent(id)}/location`, { cache: "no-store" });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Event location unavailable" }, { status: 502 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "Sign in to update this event location." }, { status: 401 });
  }
  try {
    const response = await fetch(`${API}/events/${encodeURIComponent(id)}/location`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: authorization },
      body: await request.text(),
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Event location unavailable" }, { status: 502 });
  }
}
