import { NextRequest, NextResponse } from "next/server";
import { encryptCanvaPayload, isCanvaConfigured, newCanvaAuthorization, canvaStateHash } from "../../../../../lib/canva";
import { backendUrl, publicOrigin } from "../../../../../lib/serverConfig";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "Sign in before opening Canva." }, { status: 401 });
  }
  if (!isCanvaConfigured()) {
    return NextResponse.json({ ok: false, error: "Canva is not configured yet." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const callbackUrl = `${publicOrigin(request)}/api/canva/callback`;
    const authorizationFlow = newCanvaAuthorization(callbackUrl);
    const response = await fetch(backendUrl(`/events/${encodeURIComponent(id)}/canva-job`), {
      method: "POST",
      headers: { Authorization: authorization, "Content-Type": "application/json" },
      body: JSON.stringify({
        state_hash: canvaStateHash(authorizationFlow.state),
        capability_hash: canvaStateHash(authorizationFlow.jobKey),
        encrypted_payload: encryptCanvaPayload({ codeVerifier: authorizationFlow.codeVerifier, jobKey: authorizationFlow.jobKey }),
      }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      const status = response.status === 404 ? 404 : 502;
      return NextResponse.json({ ok: false, error: status === 404 ? "Event not found." : "Canva could not be opened." }, { status });
    }
    return NextResponse.json({ ok: true, authorization_url: authorizationFlow.authorizationUrl });
  } catch {
    return NextResponse.json({ ok: false, error: "Canva could not be opened." }, { status: 502 });
  }
}
