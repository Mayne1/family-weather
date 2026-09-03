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
  const path = eventId ? `/events/${encodeURIComponent(String(eventId))}` : "/";
  const url = new URL(path, publicOrigin(request));
  url.searchParams.set("canva", result);
  return url;
}

export async function GET(request: NextRequest) {
  let eventId: string | number | undefined;
  try {
    const correlationJwt = request.nextUrl.searchParams.get("correlation_jwt") || "";
    if (!correlationJwt) return NextResponse.redirect(resultUrl(request), 303);
    const returned = await verifyCanvaReturn(correlationJwt);
    const stateHash = canvaStateHash(returned.state);
    const jobResponse = await fetch(backendUrl(`/canva-jobs/${stateHash}`), { cache: "no-store" });
    const jobData = await jobResponse.json().catch(() => null);
    if (!jobResponse.ok || !jobData?.ok) return NextResponse.redirect(resultUrl(request), 303);
    const job = jobData.job as CanvaJob;
    eventId = job.event_id;
    if (job.status !== "editing" || job.design_id !== returned.designId) {
      return NextResponse.redirect(resultUrl(request, eventId), 303);
    }
    const tokens = decryptCanvaPayload<CanvaTokenPayload>(job.encrypted_payload);
    const { artwork } = await exportCanvaPng(tokens, returned.designId);
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
    if (!saveResponse.ok || !saveData?.ok) return NextResponse.redirect(resultUrl(request, eventId), 303);
    return NextResponse.redirect(resultUrl(request, eventId, "complete"), 303);
  } catch {
    return NextResponse.redirect(resultUrl(request, eventId), 303);
  }
}
