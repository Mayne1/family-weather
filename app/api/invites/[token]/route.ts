import { NextResponse } from "next/server";
import { backendUrl } from "../../../lib/serverConfig";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const response = await fetch(backendUrl(`/invites/resolve?token=${encodeURIComponent(token)}`), { cache: "no-store" });
    const data = await response.json();
    if (response.status === 410) return NextResponse.json({ ok: true, valid: false, expired: true });
    if (!response.ok || !data.ok) return NextResponse.json(data, { status: response.status });
    const eventId = data.invite?.eventId;
    const eventResponse = await fetch(backendUrl(`/events/${encodeURIComponent(eventId)}`), { cache: "no-store" });
    const eventData = await eventResponse.json();
    if (!eventResponse.ok || !eventData.ok) return NextResponse.json(eventData, { status: eventResponse.status });
    const invitationResponse = await fetch(backendUrl(`/events/${encodeURIComponent(eventId)}/invitation`), { cache: "no-store" });
    const invitationData = await invitationResponse.json().catch(() => null);
    return NextResponse.json({
      ok: true,
      valid: true,
      accepted: Boolean(data.invite?.response),
      invite: { status: data.invite?.response || "pending" },
      event: {
        title: eventData.event?.title,
        description: eventData.event?.description,
        location: eventData.event?.location,
        starts_at: eventData.event?.starts_at,
        ends_at: eventData.event?.ends_at,
      },
      invitation: invitationResponse.ok && invitationData?.ok ? invitationData.invitation : null,
    });
  } catch (error) {
    console.error("Invitation lookup failed", error);
    return NextResponse.json({ ok: false, error: "Invitation unavailable" }, { status: 502 });
  }
}
