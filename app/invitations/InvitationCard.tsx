import { getInvitationDesign } from "./catalog";
import type { InvitationRecord } from "./catalog";
import type { CSSProperties } from "react";
import { publicEventDescription } from "./publicDescription";
import { normalizeInvitationStyle } from "./style";
import SignatureInvitation from "./SignatureInvitation";

export type InvitationEvent = {
  title: string;
  description?: string | null;
  location?: string | null;
  starts_at?: string | null;
};

type Props = {
  invitation: InvitationRecord;
  event: InvitationEvent;
  compact?: boolean;
  showBranding?: boolean;
};

export default function InvitationCard({ invitation, event, compact = false, showBranding = true }: Props) {
  const design = getInvitationDesign(invitation.design_id);
  const starts = event.starts_at ? new Date(event.starts_at) : null;
  const date = starts?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) || "Date to be announced";
  const time = starts?.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) || "Time to be announced";
  const publicDescription = publicEventDescription(event.description);
  const style = normalizeInvitationStyle(invitation.style_options);

  if (invitation.photo_url) {
    return (
      <article className={`digitalInvitation customInvitationArtwork${compact ? " compact" : ""}`}>
        {/* The host uploads completed artwork. It is intentionally shown without overlays or alterations. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- authenticated previews can use a temporary blob URL. */}
        <img src={invitation.photo_url} alt={`${invitation.headline || event.title} invitation`} />
      </article>
    );
  }

  if ("layout" in design) {
    return <SignatureInvitation invitation={invitation} event={event} artwork={design.artwork}
      title={design.name} aspectRatio={design.aspectRatio} luxe={design.layout === "luxe"} showBranding={showBranding} />;
  }

  return (
    <article
      className={`digitalInvitation invitationDesign-${design.id} invitationLook-${style.look} invitationFont-${style.font} invitationPanel-${style.panel} invitationFrame-${style.frame} invitationDepth-${style.depth}${compact ? " compact" : ""}`}
      style={{
        "--invitation-art": `url('${design.artwork}')`,
        "--invitation-aspect": "aspectRatio" in design ? design.aspectRatio : "4 / 5",
      } as CSSProperties}
    >
      <div className="digitalInvitationShade" />
      <div className="digitalInvitationFrame" aria-hidden="true" />
      <div className="digitalInvitationContent">
        <div className="digitalInvitationOrnament" aria-hidden="true"><i>✦</i><span /></div>
        {invitation.honoree_names && <p className="digitalInvitationHonoree">{invitation.honoree_names}</p>}
        <h1>{invitation.headline || event.title}</h1>
        <p className="digitalInvitationMessage">{invitation.message || publicDescription || "Please join us for a day worth remembering."}</p>
        <div className="digitalInvitationFacts">
          <p><span>Date</span><strong>{date}</strong></p>
          <p><span>Time</span><strong>{time}</strong></p>
          <p><span>Location</span><strong>{event.location || "Location to be announced"}</strong></p>
        </div>
        {invitation.special_instructions && <p className="digitalInvitationInstructions"><span>Please note</span>{invitation.special_instructions}</p>}
        {showBranding ? <p className="digitalInvitationWeather">Current event details and weather planning by Family Weather</p> : null}
      </div>
    </article>
  );
}
