import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "../../../lib/serverConfig";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature") || "";
  if (!signature) return NextResponse.json({ received: false }, { status: 400 });
  try {
    // Preserve the exact body bytes represented as UTF-8 for backend HMAC verification.
    const payload = await request.text();
    if (Buffer.byteLength(payload, "utf8") > 2_000_000) return NextResponse.json({ received: false }, { status: 413 });
    const response = await fetch(backendUrl("/billing/stripe-webhook"), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload, signature }), cache: "no-store", redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json({ received: response.ok }, { status: response.status });
  } catch {
    // Never log payment payloads, signatures or provider credentials.
    return NextResponse.json({ received: false }, { status: 502 });
  }
}
