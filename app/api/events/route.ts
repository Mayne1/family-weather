import { NextRequest, NextResponse } from "next/server";

const API = "http://127.0.0.1:3000";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "Sign in before saving this event." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const response = await fetch(`${API}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authorization },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Event service unavailable" }, { status: 502 });
  }
}
