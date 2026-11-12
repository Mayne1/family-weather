import { GOOGLE_ADS_SCRIPT_ID, hasGlobalPrivacyControl, loadGoogleAdsMeasurement, readGoogleAdsConsent } from "./googleAds.ts";

function mayMeasure(): boolean {
  try { return !hasGlobalPrivacyControl() && readGoogleAdsConsent(window.localStorage) === "granted"; }
  catch { return false; }
}

function isProduction(): boolean {
  const url = new URL(window.location.href);
  return url.protocol === "https:" && ["thefamilyweather.com", "www.thefamilyweather.com"].includes(url.hostname);
}

export function navigateWithoutReferrer(path: string): void {
  // A full document clears private form state before any Google code is loaded.
  // Suppress the private source URL, including planner parameters, in the new document.
  for (const existing of document.querySelectorAll('meta[name="referrer"]')) existing.setAttribute("content", "no-referrer");
  const meta = document.createElement("meta");
  meta.name = "referrer";
  meta.content = "no-referrer";
  document.head.appendChild(meta);
  window.location.replace(path);
}

export function canMeasureGoogleAdsConversion(): boolean { return isProduction() && mayMeasure(); }

export function runConversionBridge(destination: string, transactionId: string, returnPath: string): void {
  let finished = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const finish = () => {
    if (finished) return;
    finished = true;
    if (timeout) clearTimeout(timeout);
    navigateWithoutReferrer(returnPath);
  };
  try {
    if (!canMeasureGoogleAdsConversion() || !loadGoogleAdsMeasurement(true) || !window.gtag) { finish(); return; }
    // Give the cold loader a bounded window of its own. Once loaded, wait for
    // the conversion callback rather than cancelling a just-downloaded tag.
    timeout = setTimeout(finish, 2500);
    const script = document.getElementById(GOOGLE_ADS_SCRIPT_ID);
    script?.addEventListener("load", () => {
      if (finished) return;
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(finish, 1500);
    }, { once: true });
    script?.addEventListener("error", finish, { once: true });
    // Only the configured action and a random deduplication ID leave the site.
    // No form values, email, account ID, event ID, value or invitation token.
    window.gtag("event", "conversion", {
      send_to: destination,
      transaction_id: transactionId,
      event_callback: finish,
      event_timeout: 1500,
    });
  } catch { finish(); }
}
