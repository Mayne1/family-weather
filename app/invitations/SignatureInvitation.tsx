import type { CSSProperties } from "react";
import type { InvitationRecord } from "./catalog";
import type { InvitationEvent } from "./InvitationCard";
import { normalizeInvitationStyle } from "./style";

// Shared by the editor, public invitation and downloadable keepsake.
// Keep personalization outside the baked-in titles; never paint over the art.
export default function SignatureInvitation({ invitation, event, artwork, title, luxe, showBranding, exporting = false, aspectRatio }: {
  invitation: InvitationRecord; event: InvitationEvent; artwork: string; title: string;
  luxe: boolean; showBranding: boolean; exporting?: boolean; aspectRatio?: string;
}) {
  const start = event.starts_at ? new Date(event.starts_at) : null;
  const valid = start && Number.isFinite(start.getTime());
  const date = valid ? start.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Date to be announced";
  const time = valid ? start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "Time to be announced";
  const size = (value: number) => exporting ? value * 6 : `${value}cqw`;
  const [artWidth, artHeight] = (aspectRatio || (luxe ? "2 / 3" : "228 / 263")).split("/").map(Number);
  const exportHeight = Math.round(600 * artHeight / artWidth);
  const font = normalizeInvitationStyle(invitation.style_options).font;
  const lettering: CSSProperties = {
    fontFamily: font === "modern" || font === "bold" ? "Arial, sans-serif" : "Georgia, serif",
    fontStyle: font === "script" ? "italic" : "normal",
    fontWeight: font === "bold" ? 800 : 400,
  };
  const column: CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" };
  const facts = <div style={{ ...column, gap: size(1.5), width: "100%", color: "#ffe6a1", textShadow: "0 2px 5px #000", fontFamily: "Georgia", overflowWrap: "anywhere" }}>
    <div style={{ display: "flex", fontSize: size(5.3), lineHeight: 1.15 }}>{date}</div>
    <div style={{ display: "flex", fontSize: size(5.3), lineHeight: 1.15 }}>{time}</div>
    <div style={{ display: "flex", fontSize: size(3.5), lineHeight: 1.3, maxWidth: "100%" }}>{event.location || "Location to be announced"}</div>
  </div>;
  return <div className="signatureInvitation" style={{ ...column, width: exporting ? 600 : "100%", maxWidth: 680, ...(!exporting ? { containerType: "inline-size" as const } : {}), background: "#081825", color: "#fff4dc", overflow: "hidden", borderRadius: 16 }}>
    <div style={{ position: "relative", display: "flex", width: "100%", flexShrink: 0, ...(exporting ? { height: exportHeight } : {}) }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- also rendered by ImageResponse */}
      <img src={artwork} alt={title} width={exporting ? 600 : undefined} height={exporting ? exportHeight : undefined} style={{ width: "100%", height: exporting ? exportHeight : "auto", display: "flex", flexShrink: 0 }} />
      {luxe ? <div style={{ ...column, position: "absolute", top: "31%", left: "22%", width: "56%", padding: "2%", background: "rgba(0,8,18,.32)", borderRadius: 12 }}>{facts}</div> : null}
    </div>
    <div style={{ ...column, ...lettering, width: "100%", padding: size(5), gap: size(3), boxSizing: "border-box", borderTop: "1px solid #be984b" }}>
      {invitation.honoree_names ? <div style={{ display: "flex", fontSize: size(3.6), overflowWrap: "anywhere" }}>{invitation.honoree_names}</div> : null}
      <div style={{ display: "flex", ...lettering, fontSize: size(6), lineHeight: 1.15, color: "#ffe6a1", overflowWrap: "anywhere" }}>{invitation.headline || event.title || title}</div>
      {!luxe ? facts : null}
      {invitation.message ? <div style={{ display: "flex", fontSize: size(3.6), lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{invitation.message}</div> : null}
      {invitation.special_instructions ? <div style={{ display: "flex", fontSize: size(3.4), lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{invitation.special_instructions}</div> : null}
      {showBranding ? <div style={{ display: "flex", fontSize: size(2.8), color: "#edcd87" }}>Family Weather · Bringing people closer</div> : null}
    </div>
  </div>;
}
