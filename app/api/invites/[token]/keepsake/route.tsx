import { ImageResponse } from "next/og";
import { getInvitationDesign, suggestedInvitationDesign } from "../../../../invitations/catalog";
import type { InvitationRecord } from "../../../../invitations/catalog";

export const dynamic = "force-dynamic";

function formatDate(value?: string | null) {
  if (!value) return { date: "Date to be announced", time: "Time to be announced" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "Date to be announced", time: "Time to be announced" };
  return {
    date: date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
    time: date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
}

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const invitationResponse = await fetch(new URL(`/api/invites/${encodeURIComponent(token)}`, request.url), { cache: "no-store" });
  const data = await invitationResponse.json().catch(() => null);
  if (!invitationResponse.ok || !data?.ok || !data.valid) {
    return new Response("Invitation unavailable", { status: 404 });
  }

  const event = data.event || {};
  const invitation: InvitationRecord = data.invitation || {
    design_id: suggestedInvitationDesign(event.description),
    headline: event.title,
  };
  const design = getInvitationDesign(invitation.design_id);
  const dark = ["graduation-ascent", "birthday-after-dark", "wedding-midnight-crest", "wedding-candlelit-wood", "wedding-burgundy-bloom", "wedding-sunset-vows", "wedding-deco-noir"].includes(design.id);
  const ink = dark ? "#fffaf0" : "#172f37";
  const panel = dark ? "rgba(4,12,24,.84)" : "rgba(255,253,247,.9)";
  const accent = dark ? "#efc55a" : "#9a6b16";
  const { date, time } = formatDate(event.starts_at);
  const artworkUrl = new URL(design.artwork, request.url).toString();

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 70, backgroundImage: `url(${artworkUrl})`, backgroundSize: "cover", backgroundPosition: "center", color: ink }}>
      <div style={{ width: "100%", minHeight: 1040, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 72px", border: `2px solid ${dark ? "rgba(239,197,90,.7)" : "rgba(154,107,22,.38)"}`, borderRadius: 28, background: panel, textAlign: "center" }}>
        <div style={{ display: "flex", marginBottom: 26, color: accent, fontSize: 25, fontWeight: 800, letterSpacing: 6, textTransform: "uppercase" }}>{design.category}</div>
        {invitation.honoree_names ? <div style={{ display: "flex", marginBottom: 20, fontSize: 34, fontStyle: "italic" }}>{invitation.honoree_names}</div> : null}
        <div style={{ display: "flex", maxWidth: 920, marginBottom: 32, fontFamily: "Georgia", fontSize: 70, lineHeight: 1.02, fontWeight: 600 }}>{invitation.headline || event.title || "You’re invited"}</div>
        {invitation.message ? <div style={{ display: "flex", maxWidth: 820, marginBottom: 38, fontSize: 30, lineHeight: 1.45, fontStyle: "italic" }}>{invitation.message}</div> : null}
        <div style={{ width: "100%", display: "flex", padding: "28px 0", borderTop: `2px solid ${accent}`, borderBottom: `2px solid ${accent}` }}>
          <div style={{ width: "50%", display: "flex", flexDirection: "column", padding: "0 22px", borderRight: `1px solid ${accent}` }}><span style={{ marginBottom: 10, color: accent, fontSize: 20, fontWeight: 800, letterSpacing: 4 }}>WHEN</span><span style={{ fontSize: 28, lineHeight: 1.35 }}>{date}<br />{time}</span></div>
          <div style={{ width: "50%", display: "flex", flexDirection: "column", padding: "0 22px" }}><span style={{ marginBottom: 10, color: accent, fontSize: 20, fontWeight: 800, letterSpacing: 4 }}>WHERE</span><span style={{ fontSize: 28, lineHeight: 1.35 }}>{event.location || "Location to be announced"}</span></div>
        </div>
        {invitation.special_instructions ? <div style={{ display: "flex", maxWidth: 820, marginTop: 32, fontSize: 25, lineHeight: 1.4 }}>{invitation.special_instructions}</div> : null}
        <div style={{ display: "flex", marginTop: 50, color: accent, fontSize: 18, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase" }}>Family Weather</div>
      </div>
    </div>,
    { width: 1200, height: 1500, headers: { "Cache-Control": "private, max-age=3600" } },
  );
}
