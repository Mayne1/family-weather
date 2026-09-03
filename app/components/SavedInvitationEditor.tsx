"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import InvitationCard from "../invitations/InvitationCard";
import { invitationDesigns, suggestedInvitationDesign } from "../invitations/catalog";
import type { InvitationDesignId, InvitationRecord } from "../invitations/catalog";

type EventDetail = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  starts_at?: string;
};

type Source = "family_weather" | "upload" | "canva";

export default function SavedInvitationEditor({ event, authorization }: { event: EventDetail; authorization: string }) {
  const [source, setSource] = useState<Source>("family_weather");
  const [designId, setDesignId] = useState<InvitationDesignId>(() => suggestedInvitationDesign(event.description));
  const [headline, setHeadline] = useState(event.title);
  const [honoree, setHonoree] = useState("");
  const [message, setMessage] = useState("");
  const [instructions, setInstructions] = useState("");
  const [artwork, setArtwork] = useState<File | null>(null);
  const [artworkPreview, setArtworkPreview] = useState("");
  const [hasStoredArtwork, setHasStoredArtwork] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authorization) return;
    let disposed = false;
    let previewUrl = "";
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/events/${encodeURIComponent(event.id)}/invitation`, {
          headers: { Authorization: authorization },
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || "Invitation could not be loaded.");
        const invitation = data.invitation as InvitationRecord | null;
        if (!invitation || disposed) return;
        setDesignId(invitation.design_id);
        setHeadline(invitation.headline || event.title);
        setHonoree(invitation.honoree_names || "");
        setMessage(invitation.message || "");
        setInstructions(invitation.special_instructions || "");
        setHasStoredArtwork(Boolean(invitation.has_custom_artwork));
        if (invitation.has_custom_artwork) {
          setSource("upload");
          const artworkResponse = await fetch(`/api/events/${encodeURIComponent(event.id)}/invitation/artwork`, {
            headers: { Authorization: authorization },
            cache: "no-store",
          });
          if (artworkResponse.ok && !disposed) {
            previewUrl = URL.createObjectURL(await artworkResponse.blob());
            setArtworkPreview(previewUrl);
          }
        }
      } catch (reason) {
        if (!disposed) setError(reason instanceof Error ? reason.message : "Invitation could not be loaded.");
      } finally {
        if (!disposed) setLoading(false);
      }
    }
    load();
    return () => {
      disposed = true;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [authorization, event.id, event.title]);

  function chooseArtwork(file: File | null) {
    setError("");
    setNotice("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Upload a PNG, JPEG, or WebP invitation image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Invitation artwork must be 8 MB or smaller.");
      return;
    }
    if (artworkPreview.startsWith("blob:")) URL.revokeObjectURL(artworkPreview);
    setArtwork(file);
    setArtworkPreview(URL.createObjectURL(file));
    setSource("upload");
  }

  const invitation: InvitationRecord = {
    design_id: designId,
    headline: headline || event.title,
    honoree_names: honoree,
    message,
    special_instructions: instructions,
    photo_url: source === "upload" ? artworkPreview : null,
  };

  async function save(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(event.id)}/invitation`, {
        method: "PUT",
        headers: { Authorization: authorization, "Content-Type": "application/json" },
        body: JSON.stringify(invitation),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Invitation could not be saved.");

      if (source === "canva") {
        const canvaResponse = await fetch(`/api/events/${encodeURIComponent(event.id)}/canva/start`, {
          method: "POST",
          headers: { Authorization: authorization },
        });
        const canvaData = await canvaResponse.json();
        if (!canvaResponse.ok || !canvaData.ok || !canvaData.authorization_url) {
          throw new Error(canvaData.error || "Canva could not be opened.");
        }
        window.location.assign(canvaData.authorization_url);
        return;
      }

      if (source === "upload") {
        if (!artwork && !hasStoredArtwork) throw new Error("Choose your finished invitation image before saving.");
        if (artwork) {
          const artworkResponse = await fetch(`/api/events/${encodeURIComponent(event.id)}/invitation/artwork`, {
            method: "PUT",
            headers: { Authorization: authorization, "Content-Type": artwork.type },
            body: artwork,
          });
          const artworkData = await artworkResponse.json();
          if (!artworkResponse.ok || !artworkData.ok) throw new Error(artworkData.error || "Invitation artwork could not be saved.");
          setHasStoredArtwork(true);
          setArtwork(null);
        }
      } else {
        const artworkResponse = await fetch(`/api/events/${encodeURIComponent(event.id)}/invitation/artwork`, {
          method: "DELETE",
          headers: { Authorization: authorization },
        });
        const artworkData = await artworkResponse.json();
        if (!artworkResponse.ok || !artworkData.ok) throw new Error(artworkData.error || "Invitation could not be saved.");
        setHasStoredArtwork(false);
        setArtwork(null);
        if (artworkPreview.startsWith("blob:")) URL.revokeObjectURL(artworkPreview);
        setArtworkPreview("");
      }
      setNotice("Invitation saved. You can leave and come back without losing it.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Invitation could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="savedInvitationPanel">
    <div className="savedInvitationHeading"><div><p className="eyebrow dark"><span /> Invitation</p><h2>Finish it now or come back later.</h2><p>Your event and saved invitation stay here even before purchase.</p></div><span>{hasStoredArtwork ? "Artwork saved" : "Editable draft"}</span></div>
    {loading ? <p className="invitationEditorLoading">Loading the saved invitation…</p> : <form className="invitationCustomizer" onSubmit={save}>
      <div className="invitationSourceChooser" role="group" aria-label="Invitation artwork source">
        <button className={source === "family_weather" ? "active" : ""} type="button" onClick={() => { setSource("family_weather"); setNotice(""); }} aria-pressed={source === "family_weather"}><strong>Family Weather design</strong><small>Choose a design and edit its wording.</small></button>
        <button className={source === "upload" ? "active" : ""} type="button" onClick={() => { setSource("upload"); setNotice(""); }} aria-pressed={source === "upload"}><strong>Upload finished artwork</strong><small>Use a completed image from this device.</small></button>
        <button className={source === "canva" ? "active" : ""} type="button" onClick={() => { setSource("canva"); setNotice(""); }} aria-pressed={source === "canva"}><strong>Design in Canva</strong><small>Create a design and return it automatically.</small></button>
      </div>
      {source === "family_weather" ? <fieldset className="designChooser"><legend>Choose a design</legend><div>{invitationDesigns.map((design) => <button className={designId === design.id ? "active" : ""} type="button" key={design.id} onClick={() => setDesignId(design.id)} aria-pressed={designId === design.id}><b style={{ backgroundImage: `url('${design.artwork}')` }}>{design.mark}</b><span><strong>{design.name}</strong><small>{design.category} · {design.note}</small></span></button>)}</div></fieldset> : source === "upload" ? <div className="customArtworkPicker"><div><strong>{hasStoredArtwork ? "Replace the saved artwork" : "Upload the finished invitation"}</strong><p>PNG, JPEG, or WebP · up to 8 MB. Nothing will be printed over it.</p></div><label className="uploadArtworkButton"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(changeEvent) => chooseArtwork(changeEvent.target.files?.[0] || null)} /><span>{hasStoredArtwork || artwork ? "Choose a different image" : "Choose image"}</span></label>{artwork ? <small className="customArtworkName">Selected: {artwork.name}</small> : null}</div> : <div className="canvaArtworkPicker"><div><small>CANVA CONNECT</small><strong>Open a fresh invitation canvas.</strong><p>Use Return to Family Weather when the design is finished.</p></div><span aria-hidden="true">C</span></div>}
      <div className="invitationWorkArea">
        {source === "canva" ? <div className="customArtworkPlaceholder canvaPlaceholder"><span>C</span><strong>Your Canva design returns here as finished artwork.</strong></div> : source === "upload" && !artworkPreview ? <div className="customArtworkPlaceholder"><span>↑</span><strong>{hasStoredArtwork ? "Your saved artwork is protected." : "Choose an invitation image."}</strong></div> : <InvitationCard compact invitation={invitation} event={event} />}
        {source === "family_weather" ? <div className="invitationFields"><label className="formField"><span>Headline</span><input value={headline} onChange={(changeEvent) => setHeadline(changeEvent.target.value)} maxLength={120} placeholder={event.title} /></label><label className="formField"><span>Person, couple, or group being celebrated (optional)</span><input value={honoree} onChange={(changeEvent) => setHonoree(changeEvent.target.value)} maxLength={160} /></label><label className="formField"><span>Invitation message</span><textarea value={message} onChange={(changeEvent) => setMessage(changeEvent.target.value)} rows={4} maxLength={500} /></label><label className="formField"><span>Dress code or special instructions (optional)</span><textarea value={instructions} onChange={(changeEvent) => setInstructions(changeEvent.target.value)} rows={3} maxLength={300} /></label></div> : <div className="customArtworkExplanation"><small>{source === "canva" ? "DESIGN IN CANVA" : "FINISHED ARTWORK"}</small><h4>Family Weather keeps the event controls around it.</h4><p>The date, time, location, invitation link, and RSVP experience continue working normally.</p></div>}
      </div>
      <button className="primaryCta" disabled={saving || (source === "upload" && !artwork && !hasStoredArtwork)}>{saving ? source === "canva" ? "Opening Canva…" : "Saving invitation…" : source === "canva" ? "Design this invitation in Canva" : source === "upload" ? "Save uploaded invitation" : "Save invitation design"}<span>→</span></button>
      {notice ? <p className="inviteSuccess" role="status">{notice}</p> : null}{error ? <p className="formError" role="alert">{error}</p> : null}
    </form>}
  </section>;
}
