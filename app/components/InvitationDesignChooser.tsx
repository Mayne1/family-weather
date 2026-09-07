"use client";

import { useState } from "react";
import { archivedInvitationDesigns, featuredInvitationDesigns } from "../invitations/catalog";
import type { InvitationDesignId } from "../invitations/catalog";

type Props = {
  activity?: string | null;
  value: InvitationDesignId;
  onChange: (designId: InvitationDesignId) => void;
};

export default function InvitationDesignChooser({ activity, value, onChange }: Props) {
  const [showArchive, setShowArchive] = useState(false);
  const featured = featuredInvitationDesigns(activity);
  const archive = archivedInvitationDesigns(activity);
  const choices = showArchive ? [...featured, ...archive] : featured;

  return <fieldset className="designChooser">
    <legend>{featured.some((design) => "curated" in design) ? "Choose your invitation level" : "Choose a professional starting design"}</legend>
    <div>{choices.map((design) => <button className={value === design.id ? "active" : ""} type="button" key={design.id} onClick={() => onChange(design.id)} aria-pressed={value === design.id}><b style={{ backgroundImage: `url('${design.artwork}')` }}>{design.mark}</b><span><strong>{design.name}</strong><small>{design.category} · {design.note}</small></span></button>)}</div>
    {archive.length ? <button className="designArchiveToggle" type="button" onClick={() => setShowArchive((current) => !current)}>{showArchive ? "Show the featured collection" : `Browse ${archive.length} more designs`} <span>{showArchive ? "↑" : "↓"}</span></button> : null}
  </fieldset>;
}
