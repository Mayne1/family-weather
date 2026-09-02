import { NextRequest, NextResponse } from "next/server";
import { backendUrl, publicOrigin } from "../../../../lib/serverConfig";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return NextResponse.json({ ok: false, error: "Sign in to view this event purchase." }, { status: 401 });
  try {
    const { id } = await context.params;
    const response = await fetch(backendUrl(`/events/${encodeURIComponent(id)}/entitlement`), { headers: { Authorization: authorization }, cache: "no-store" });
    const data = await response.json();
    if (data?.entitlement?.share_invite_token) data.entitlement.share_invitation_url = `${publicOrigin(request)}/invitation/${encodeURIComponent(data.entitlement.share_invite_token)}`;
    return NextResponse.json(data, { status: response.status });
  } catch (error) { console.error("Entitlement lookup failed", error); return NextResponse.json({ ok: false, error: "Event purchase information is unavailable." }, { status: 502 }); }
}
