import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "../../../lib/serverConfig";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature") || "";
  if (!signature) return NextResponse.json({ received: false }, { status: 400 });
  try {
    const payload = await request.text();
    const response = await fetch(backendUrl("/billing/stripe-webhook"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload, signature }), cache: "no-store" });
    return NextResponse.json({ received: response.ok }, { status: response.status });
  } catch (error) { console.error("Stripe webhook forwarding failed", error); return NextResponse.json({ received: false }, { status: 502 }); }
}
