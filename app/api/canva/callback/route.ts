import { NextRequest, NextResponse } from "next/server";
import {
  canvaStateHash,
  createCanvaDesign,
  decryptCanvaPayload,
  encryptCanvaPayload,
  exchangeCanvaCode,
  type CanvaJob,
} from "../../../lib/canva";
import { backendUrl, publicOrigin } from "../../../lib/serverConfig";

function failed(request: NextRequest) {
  return NextResponse.redirect(new URL("/?canva=authorization_failed", publicOrigin(request)), 303);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") || "";
  const state = request.nextUrl.searchParams.get("state") || "";
  if (!code || !/^[A-Za-z0-9_-]{40,50}$/.test(state) || request.nextUrl.searchParams.has("error")) return failed(request);

  try {
    const stateHash = canvaStateHash(state);
    const jobResponse = await fetch(backendUrl(`/canva-jobs/${stateHash}`), { cache: "no-store" });
    const jobData = await jobResponse.json().catch(() => null);
    if (!jobResponse.ok || !jobData?.ok) return failed(request);
    const job = jobData.job as CanvaJob;
    if (job.status !== "authorizing") return failed(request);
    const { codeVerifier, jobKey } = decryptCanvaPayload<{ codeVerifier: string; jobKey: string }>(job.encrypted_payload);
    const callbackUrl = `${publicOrigin(request)}/api/canva/callback`;
    const tokens = await exchangeCanvaCode(code, codeVerifier, callbackUrl, jobKey);
    const design = await createCanvaDesign(tokens.accessToken, job.event_title);
    const updateResponse = await fetch(backendUrl(`/canva-jobs/${stateHash}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Canva-Job-Key": jobKey },
      body: JSON.stringify({
        encrypted_payload: encryptCanvaPayload(tokens),
        design_id: design.designId,
        status: "editing",
      }),
      cache: "no-store",
    });
    const updateData = await updateResponse.json().catch(() => null);
    if (!updateResponse.ok || !updateData?.ok) return failed(request);
    const editUrl = new URL(design.editUrl);
    editUrl.searchParams.set("correlation_state", state);
    return NextResponse.redirect(editUrl, 303);
  } catch {
    return failed(request);
  }
}
