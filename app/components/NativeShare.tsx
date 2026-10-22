"use client";

import { useEffect, useState } from "react";
import { shareLink, sharePayload } from "../lib/nativeShare";

export default function NativeShare({ kind, title, url }: {
  kind: "invitation" | "announcement"; title: string; url: string;
}) {
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [manual, setManual] = useState(false);
  const label = kind === "invitation" ? "Invitation" : "Announcement";
  useEffect(() => {
    const data = sharePayload(kind, title, url);
    setSupported(typeof navigator.share === "function" &&
      (!navigator.canShare || navigator.canShare(data)));
  }, [kind, title, url]);

  async function share() {
    setBusy(true); setStatus("");
    // No network request before share(): preserve the user's click activation.
    const result = await shareLink(navigator, sharePayload(kind, title, url));
    if (result === "unavailable") {
      setSupported(false);
      setStatus("Sharing isn't available here. Use Copy " + label + " Link.");
    }
    // A resolved share promise is not proof of delivery. Cancellation is quiet.
    setBusy(false);
  }

  async function copy() {
    setStatus("");
    try {
      await navigator.clipboard.writeText(url);
      setManual(false);
      setStatus(label + " link copied. Paste it into your message.");
    } catch {
      setManual(true);
      setStatus("Select and copy the link below.");
    }
  }

  return <div>
    {supported && <button type="button" disabled={busy} onClick={() => void share()}>Share {label}</button>}{" "}
    <button type="button" disabled={busy} onClick={() => void copy()}>Copy {label} Link</button>
    {status && <p role="status" aria-live="polite">{status}</p>}
    {manual && <input aria-label={`${label} link to copy`} readOnly value={url}
      onFocus={event => event.target.select()} onClick={event => event.currentTarget.select()} />}
  </div>;
}
