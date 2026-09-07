import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "../../../lib/serverConfig";
import { enforceRateLimit } from "../../../lib/requestSecurity";

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return NextResponse.json({ ok: false, error: "Administrator sign-in required." }, { status: 401 });
  try {
    const response = await fetch(backendUrl("/billing/promo-codes"), { headers: { Authorization: authorization }, cache: "no-store" });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Promotion code lookup is temporarily unavailable." }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, "promotion-admin", 5, 60 * 60_000);
  if (limited) return limited;
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return NextResponse.json({ ok: false, error: "Administrator sign-in required." }, { status: 401 });
  try {
    const body = await request.json();
    const response = await fetch(backendUrl("/billing/promo-codes"), {
      method: "POST",
      headers: { Authorization: authorization, "Content-Type": "application/json" },
      body: JSON.stringify({ product_code: body.product_code, count: body.count, action: body.action, code: body.code }),
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Promotion code generation failed", error);
    return NextResponse.json({ ok: false, error: "Promotion code generation is temporarily unavailable." }, { status: 502 });
  }
}
