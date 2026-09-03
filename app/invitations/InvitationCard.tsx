import { getInvitationDesign } from "./catalog";
import type { InvitationRecord } from "./catalog";
import type { CSSProperties } from "react";

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
};

export default function InvitationCard({ invitation, event, compact = false }: Props) {
  const design = getInvitationDesign(invitation.design_id);
  const starts = event.starts_at ? new Date(event.starts_at) : null;
  const date = starts?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) || "Date to be announced";
  const time = starts?.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) || "Time to be announced";

  if (invitation.photo_url) {
    return (
      <article className={`digitalInvitation customInvitationArtwork${compact ? " compact" : ""}`}>
        {/* The host uploads completed artwork. It is intentionally shown without overlays or alterations. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- authenticated previews can use a temporary blob URL. */}
        <img src={invitation.photo_url} alt={`${invitation.headline || event.title} invitation`} />
      </article>
    );
  }

  return (
    <article
      className={`digitalInvitation invitationDesign-${design.id}${compact ? " compact" : ""}`}
      style={{
        "--invitation-art": `url('${design.artwork}')`,
        "--invitation-aspect": "aspectRatio" in design ? design.aspectRatio : "4 / 5",
      } as CSSProperties}
    >
      <div className="digitalInvitationShade" />
      <div className="digitalInvitationContent">
        <p className="digitalInvitationCategory">{design.category}</p>
        {invitation.honoree_names && <p className="digitalInvitationHonoree">{invitation.honoree_names}</p>}
        <h1>{invitation.headline || event.title}</h1>
        <p className="digitalInvitationMessage">{invitation.message || event.description || "Please join us for a day worth remembering."}</p>
        <div className="digitalInvitationFacts">
          <p><span>Date</span><strong>{date}</strong></p>
          <p><span>Time</span><strong>{time}</strong></p>
          <p><span>Location</span><strong>{event.location || "Location to be announced"}</strong></p>
        </div>
        {invitation.special_instructions && <p className="digitalInvitationInstructions"><span>Please note</span>{invitation.special_instructions}</p>}
        <p className="digitalInvitationWeather">Current event details and weather planning by Family Weather</p>
      </div>
    </article>
  );
}
