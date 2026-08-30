import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
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
  const artwork = await readFile(join(process.cwd(), "public", design.artwork.replace(/^\//, "")));
  const artworkData = `data:image/webp;base64,${artwork.toString("base64")}`;

  return new ImageResponse(
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: ink, overflow: "hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse requires a plain image element. */}
      <img src={artworkData} alt="" width="1200" height="1500" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 46, display: "flex", border: `2px solid ${dark ? "rgba(239,197,90,.72)" : "rgba(154,107,22,.45)"}`, borderRadius: 28 }} />
      <div style={{ position: "relative", width: "1020px", display: "flex", flexDirection: "column", alignItems: "center", padding: "58px 68px", borderTop: `2px solid ${accent}`, borderBottom: `2px solid ${accent}`, background: panel, textAlign: "center" }}>
        <div style={{ display: "flex", marginBottom: 20, color: accent, fontSize: 23, fontWeight: 800, letterSpacing: 6, textTransform: "uppercase" }}>{design.category}</div>
        {invitation.honoree_names ? <div style={{ display: "flex", marginBottom: 16, fontFamily: "Georgia", fontSize: 34, fontStyle: "italic" }}>{invitation.honoree_names}</div> : null}
        <div style={{ display: "flex", maxWidth: 900, marginBottom: 24, fontFamily: "Georgia", fontSize: 66, lineHeight: 1.04, fontWeight: 600 }}>{invitation.headline || event.title || "You’re invited"}</div>
        {invitation.message ? <div style={{ display: "flex", maxWidth: 820, marginBottom: 28, fontFamily: "Georgia", fontSize: 29, lineHeight: 1.4, fontStyle: "italic" }}>{invitation.message}</div> : null}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 25, borderTop: `1px solid ${accent}` }}>
          <div style={{ display: "flex", marginBottom: 8, color: accent, fontSize: 19, fontWeight: 800, letterSpacing: 4 }}>WHEN</div>
          <div style={{ display: "flex", marginBottom: 24, fontSize: 27, lineHeight: 1.35 }}>{date} · {time}</div>
          <div style={{ display: "flex", marginBottom: 8, color: accent, fontSize: 19, fontWeight: 800, letterSpacing: 4 }}>WHERE</div>
          <div style={{ display: "flex", maxWidth: 850, fontSize: 27, lineHeight: 1.35 }}>{event.location || "Location to be announced"}</div>
        </div>
        {invitation.special_instructions ? <div style={{ display: "flex", maxWidth: 820, marginTop: 25, paddingTop: 22, borderTop: `1px solid ${accent}`, fontSize: 24, lineHeight: 1.4 }}>{invitation.special_instructions}</div> : null}
        <div style={{ display: "flex", marginTop: 34, color: accent, fontSize: 17, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase" }}>Family Weather</div>
      </div>
    </div>,
    { width: 1200, height: 1500, headers: { "Cache-Control": "private, max-age=3600" } },
  );
}
