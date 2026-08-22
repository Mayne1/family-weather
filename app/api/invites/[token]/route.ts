import { NextResponse } from "next/server";

const API = "http://127.0.0.1:3000";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const response = await fetch(`${API}/invites/${encodeURIComponent(token)}`, { cache: "no-store" });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Invitation unavailable" }, { status: 502 });
  }
}
