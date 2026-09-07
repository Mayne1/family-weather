import { NextRequest, NextResponse } from "next/server";
import { backendUrl, publicOrigin } from "../../../../lib/serverConfig";
import { enforceRateLimit } from "../../../../lib/requestSecurity";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const limited = enforceRateLimit(request, "promotion-code", 10, 30 * 60_000);
  if (limited) return limited;
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return NextResponse.json({ ok: false, error: "Sign in before using a promotion code." }, { status: 401 });
  try {
    const { id } = await context.params;
    const body = await request.json();
    const code = String(body.code || "").trim().toUpperCase();
    if (!/^FW-[A-F0-9]{12}$/.test(code)) return NextResponse.json({ ok: false, error: "That promotion code is not valid." }, { status: 400 });
    const response = await fetch(backendUrl(`/events/${encodeURIComponent(id)}/entitlement/promo`), {
      method: "POST",
      headers: { Authorization: authorization, "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
      cache: "no-store",
    });
    const data = await response.json();
    if (data?.entitlement?.share_invite_token) data.entitlement.share_invitation_url = `${publicOrigin(request)}/invitation/${encodeURIComponent(data.entitlement.share_invite_token)}`;
    const error = data.error === "promotion_code_invalid" ? "That promotion code is invalid or has already been used." : data.error === "promotion_would_not_upgrade_event" ? "This event already includes that promotion level or better." : data.error;
    return NextResponse.json({ ...data, ...(error ? { error } : {}) }, { status: response.status });
  } catch (error) {
    console.error("Promotion redemption failed", error);
    return NextResponse.json({ ok: false, error: "Promotion code service is temporarily unavailable." }, { status: 502 });
  }
}
