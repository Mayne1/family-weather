import { NextRequest, NextResponse } from "next/server";
import {
  canvaStateHash,
  decryptCanvaPayload,
  exportCanvaPng,
  verifyCanvaReturn,
  type CanvaJob,
  type CanvaTokenPayload,
} from "../../../lib/canva";
import { backendUrl, publicOrigin } from "../../../lib/serverConfig";

function resultUrl(request: NextRequest, eventId?: string | number, result = "failed") {
  const path = eventId ? `/events/${encodeURIComponent(String(eventId))}` : "/events";
  const url = new URL(path, publicOrigin(request));
  url.searchParams.set("canva", result);
  return url;
}

export async function GET(request: NextRequest) {
  let eventId: string | number | undefined;
  let stage = "read_return_token";
  try {
    const correlationJwt = request.nextUrl.searchParams.get("correlation_jwt") || "";
    if (!correlationJwt) throw new Error("missing_canva_return_token");
    stage = "verify_return_token";
    const returned = await verifyCanvaReturn(correlationJwt);
    const stateHash = canvaStateHash(returned.state);
    stage = "load_canva_job";
    const jobResponse = await fetch(backendUrl(`/canva-jobs/${stateHash}`), { cache: "no-store" });
    const jobData = await jobResponse.json().catch(() => null);
    if (!jobResponse.ok || !jobData?.ok) throw new Error("canva_job_not_found");
    const job = jobData.job as CanvaJob;
    eventId = job.event_id;
    stage = "validate_canva_job";
    if (job.status !== "editing" || job.design_id !== returned.designId) {
      console.error("canva_return_failed", { stage, hasEventId: true, reason: "canva_job_mismatch" });
      return NextResponse.redirect(resultUrl(request, eventId), 303);
    }
    stage = "export_canva_design";
    const tokens = decryptCanvaPayload<CanvaTokenPayload>(job.encrypted_payload);
    const { artwork } = await exportCanvaPng(tokens, returned.designId);
    stage = "save_canva_artwork";
    const saveResponse = await fetch(backendUrl(`/canva-jobs/${stateHash}/artwork`), {
      method: "POST",
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(artwork.length),
        "X-Canva-Design-Id": returned.designId,
        "X-Canva-Job-Key": tokens.jobKey,
      },
      body: artwork,
      cache: "no-store",
    });
    const saveData = await saveResponse.json().catch(() => null);
    if (!saveResponse.ok || !saveData?.ok) throw new Error("canva_artwork_save_failed");
    return NextResponse.redirect(resultUrl(request, eventId, "complete"), 303);
  } catch (error) {
    console.error("canva_return_failed", {
      stage,
      hasEventId: eventId !== undefined,
      reason: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.redirect(resultUrl(request, eventId), 303);
  }
}
