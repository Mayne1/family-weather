"use client";

/* A full navigation prevents loaded advertising code from following private routes. */
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  GOOGLE_ADS_CONSENT_EVENT, GOOGLE_ADS_CONSENT_KEY, hasGlobalPrivacyControl,
  loadGoogleAdsMeasurement, readGoogleAdsConsent, requiresGoogleAdsDocumentNavigation, revokeGoogleAdsMeasurement,
  supportsGoogleAdsPage, writeGoogleAdsConsent,
} from "../lib/googleAds";
import type { GoogleAdsConsent } from "../lib/googleAds";
import styles from "./GoogleAdsMeasurement.module.css";

export default function GoogleAdsMeasurement() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<GoogleAdsConsent | null>(null);
  const [error, setError] = useState("");
  const [privacySignal, setPrivacySignal] = useState(false);

  useEffect(() => {
    function sync() {
      const globalPrivacy = hasGlobalPrivacyControl();
      let saved: GoogleAdsConsent | null = null;
      try { saved = readGoogleAdsConsent(window.localStorage); } catch { /* Default denied. */ }
      const url = new URL(window.location.href);
      setVisible(supportsGoogleAdsPage(url) || url.pathname === "/privacy");
      setPrivacySignal(globalPrivacy);
      setChoice(saved);
      setOpen(!saved && !globalPrivacy && supportsGoogleAdsPage(url));
      if (saved === "granted" && !globalPrivacy) loadGoogleAdsMeasurement();
      else revokeGoogleAdsMeasurement();
    }
    const initialSync = window.setTimeout(sync, 0);
    function storage(event: StorageEvent) { if (!event.key || event.key === GOOGLE_ADS_CONSENT_KEY) sync(); }
    function navigate(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const destination = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);
      if (!requiresGoogleAdsDocumentNavigation(current, destination, !!window.familyWeatherGoogleAdsLoaded)) return;
      event.preventDefault();
      event.stopPropagation();
      window.location.assign(destination.href);
    }
    window.addEventListener(GOOGLE_ADS_CONSENT_EVENT, sync);
    window.addEventListener("storage", storage);
    document.addEventListener("click", navigate, true);
    return () => {
      window.clearTimeout(initialSync);
      window.removeEventListener(GOOGLE_ADS_CONSENT_EVENT, sync);
      window.removeEventListener("storage", storage);
      document.removeEventListener("click", navigate, true);
    };
  }, [pathname]);

  function choose(next: GoogleAdsConsent) {
    setError("");
    let saved = false;
    try { saved = writeGoogleAdsConsent(window.localStorage, next); } catch { /* Fail closed. */ }
    if (!saved) { setError("Your browser could not save this choice. Enable site storage in your browser, then try again."); return; }
    setChoice(next);
    setOpen(false);
    window.dispatchEvent(new Event(GOOGLE_ADS_CONSENT_EVENT));
  }

  if (!visible) return null;
  return <aside className={styles.root} aria-label="Google Ads measurement choices">
    {open ? <section className={styles.panel} aria-labelledby="google-ads-choice-title">
      <h2 id="google-ads-choice-title">Help us measure our ads?</h2>
      <p>With your permission, Google Ads can use cookies and receive ad-click and browser information on public pages to measure our advertising. This does not enable personalized ads. You can decline and keep using the site.</p>
      <p>This choice is for Google Ads measurement. <a href="/privacy">Privacy policy</a></p>
      {privacySignal ? <p>Your browser privacy signal keeps Google Ads measurement off.</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <div className={styles.actions}>
        <button type="button" onClick={() => choose("denied")}>Decline measurement</button>
        <button type="button" disabled={privacySignal} onClick={() => choose("granted")}>Allow measurement</button>
        {choice || privacySignal ? <button type="button" onClick={() => setOpen(false)}>Close</button> : null}
      </div>
    </section> : <button type="button" className={styles.settings} onClick={() => setOpen(true)}>Ad measurement choices</button>}
  </aside>;
}
