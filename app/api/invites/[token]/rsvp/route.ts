import { NextRequest, NextResponse } from "next/server";

const API = "http://127.0.0.1:3000";

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const body = await request.json();
    const response = await fetch(`${API}/invites/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, response: body.response, responderEmail: body.email || null }),
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "RSVP service unavailable" }, { status: 502 });
  }
}
