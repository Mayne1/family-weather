import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "../../../../lib/serverConfig";
import { enforceRateLimit } from "../../../../lib/requestSecurity";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const limited = enforceRateLimit(request, "commerce-event", 60, 10 * 60_000);
  if (limited) return limited;
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const { id } = await context.params;
    const body = await request.json();
    const response = await fetch(backendUrl(`/events/${encodeURIComponent(id)}/commerce-event`), {
      method: "POST",
      headers: { Authorization: authorization, "Content-Type": "application/json" },
      body: JSON.stringify({ event_name: body.event_name, detail: body.detail }),
      cache: "no-store",
    });
    return NextResponse.json({ ok: response.ok }, { status: response.status });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
