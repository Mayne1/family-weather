import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getInvitationDesign, suggestedInvitationDesign } from "../../../../invitations/catalog";
import type { InvitationRecord } from "../../../../invitations/catalog";
import { normalizeInvitationStyle } from "../../../../invitations/style";
import { backendUrl } from "../../../../lib/serverConfig";

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
  if (invitation.has_custom_artwork && invitation.event_id) {
    const artworkResponse = await fetch(
      backendUrl(`/events/${encodeURIComponent(invitation.event_id)}/invitation/artwork?token=${encodeURIComponent(token)}`),
      { cache: "no-store" },
    );
    if (artworkResponse.ok) {
      return new Response(artworkResponse.body, {
        status: 200,
        headers: {
          "Content-Type": artworkResponse.headers.get("content-type") || invitation.artwork_mime || "application/octet-stream",
          "Cache-Control": "private, max-age=3600",
        },
      });
    }
  }
  const design = getInvitationDesign(invitation.design_id);
  const style = normalizeInvitationStyle(invitation.style_options);
  const dark = style.look === "dramatic" || style.panel === "dark-glass";
  const ink = dark ? "#fffaf0" : "#172f37";
  const panel = style.panel === "open" ? "transparent" : dark ? "rgba(4,12,24,.82)" : style.panel === "spotlight" ? "rgba(255,253,247,.68)" : "rgba(255,253,247,.84)";
  const accent = style.look === "bright" ? "#d64e66" : style.look === "natural" ? "#8c6338" : dark ? "#efc55a" : "#9a6b16";
  const headlineFont = style.font === "modern" || style.font === "bold" ? "Arial" : "Georgia";
  const frameWidth = style.frame === "none" ? 0 : style.frame === "fine-line" ? 1 : 3;
  const showBranding = data.presentation !== "unbranded";
  const { date, time } = formatDate(event.starts_at);
  const artwork = await readFile(join(process.cwd(), "public", design.artwork.replace(/^\//, "")));
  const artworkData = `data:image/webp;base64,${artwork.toString("base64")}`;

  return new ImageResponse(
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: ink, overflow: "hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse requires a plain image element. */}
      <img src={artworkData} alt="" width="1200" height="1500" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 46, display: "flex", border: `${frameWidth}px ${style.frame === "double-line" || style.frame === "gold-leaf" ? "double" : "solid"} ${accent}`, borderRadius: 28 }} />
      <div style={{ position: "relative", width: "940px", display: "flex", flexDirection: "column", alignItems: "center", padding: "64px 68px", border: style.panel === "open" ? "0" : `1px solid ${accent}`, borderRadius: 18, background: panel, textAlign: "center" }}>
        {invitation.honoree_names ? <div style={{ display: "flex", marginBottom: 16, fontFamily: "Georgia", fontSize: 34, fontStyle: "italic" }}>{invitation.honoree_names}</div> : null}
        <div style={{ display: "flex", maxWidth: 900, marginBottom: 24, fontFamily: headlineFont, fontSize: style.font === "bold" ? 72 : 66, lineHeight: .98, fontWeight: style.font === "bold" ? 900 : 600, textTransform: style.font === "bold" ? "uppercase" : "none" }}>{invitation.headline || event.title || "You’re invited"}</div>
        {invitation.message ? <div style={{ display: "flex", maxWidth: 820, marginBottom: 28, fontFamily: "Georgia", fontSize: 29, lineHeight: 1.4, fontStyle: "italic" }}>{invitation.message}</div> : null}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 25, borderTop: `1px solid ${accent}` }}>
          <div style={{ display: "flex", marginBottom: 8, color: accent, fontSize: 19, fontWeight: 800, letterSpacing: 4 }}>WHEN</div>
          <div style={{ display: "flex", marginBottom: 24, fontSize: 27, lineHeight: 1.35 }}>{date} · {time}</div>
          <div style={{ display: "flex", marginBottom: 8, color: accent, fontSize: 19, fontWeight: 800, letterSpacing: 4 }}>WHERE</div>
          <div style={{ display: "flex", maxWidth: 850, fontSize: 27, lineHeight: 1.35 }}>{event.location || "Location to be announced"}</div>
        </div>
        {invitation.special_instructions ? <div style={{ display: "flex", maxWidth: 820, marginTop: 25, paddingTop: 22, borderTop: `1px solid ${accent}`, fontSize: 24, lineHeight: 1.4 }}>{invitation.special_instructions}</div> : null}
        {showBranding ? <div style={{ display: "flex", marginTop: 34, color: accent, fontSize: 17, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase" }}>Family Weather</div> : null}
      </div>
    </div>,
    { width: 1200, height: 1500, headers: { "Cache-Control": "private, max-age=3600" } },
  );
}
