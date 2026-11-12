export const GOOGLE_ADS_ID = "AW-951353708";
export const GOOGLE_ADS_SCRIPT_ID = "family-weather-google-ads";
export const GOOGLE_ADS_CONSENT_KEY = "family-weather-google-ads-consent-v1";
export const GOOGLE_ADS_CONSENT_EVENT = "family-weather-google-ads-consent";
export type GoogleAdsConsent = "granted" | "denied";

const publicPaths = new Set([
  "/", "/today", "/plan", "/weather-history", "/how-it-works", "/about",
  "/pricing", "/faq", "/live", "/weather-planning", "/event-weather-planning", "/weather-stories",
]);
const clickParameters = new Set(["gclid", "gbraid", "wbraid", "gad_source", "gad_campaignid"]);
const consentLifetime = 180 * 24 * 60 * 60 * 1000;

// Fail closed for private routes, planner details, tokens, fragments and unknown parameters.
// A clean page_location alone is not enough: Google can also read the document URL.
export function supportsGoogleAdsPage(url: URL): boolean {
  if (!publicPaths.has(url.pathname) && !/^\/weather-stories\/[a-z0-9-]+$/.test(url.pathname)) return false;
  if (url.hash) return false;
  return [...url.searchParams].every(([key, value]) => clickParameters.has(key) && /^[A-Za-z0-9_-]{1,256}$/.test(value));
}

export function requiresGoogleAdsDocumentNavigation(current: URL, destination: URL, loaded: boolean): boolean {
  if (destination.origin !== current.origin) return false;
  if (destination.pathname === current.pathname && destination.search === current.search && destination.hash) return false;
  return loaded || supportsGoogleAdsPage(current) !== supportsGoogleAdsPage(destination);
}

export function readGoogleAdsConsent(storage: Pick<Storage, "getItem">, now = Date.now()): GoogleAdsConsent | null {
  try {
    const value = JSON.parse(storage.getItem(GOOGLE_ADS_CONSENT_KEY) || "null");
    if ((value?.choice === "granted" || value?.choice === "denied") && typeof value?.updatedAt === "number" && value.updatedAt <= now && now - value.updatedAt < consentLifetime) return value.choice;
  } catch { /* Unavailable or malformed storage never grants consent. */ }
  return null;
}

export function writeGoogleAdsConsent(storage: Pick<Storage, "setItem">, choice: GoogleAdsConsent): boolean {
  try {
    storage.setItem(GOOGLE_ADS_CONSENT_KEY, JSON.stringify({ choice, updatedAt: Date.now() }));
    return true;
  } catch { return false; }
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    familyWeatherGoogleAdsLoaded?: boolean;
  }
}

export function hasGlobalPrivacyControl(): boolean {
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

export function loadGoogleAdsMeasurement(): boolean {
  const url = new URL(window.location.href);
  if (window.familyWeatherGoogleAdsLoaded) return true;
  if (url.protocol !== "https:" || !["thefamilyweather.com", "www.thefamilyweather.com"].includes(url.hostname)) return false;
  if (!supportsGoogleAdsPage(url) || hasGlobalPrivacyControl()) return false;
  try { if (readGoogleAdsConsent(window.localStorage) !== "granted") return false; } catch { return false; }
  // Do not expose a private source URL when returning to a public page.
  if (document.referrer) {
    try {
      const referrer = new URL(document.referrer);
      if (referrer.origin === url.origin && !supportsGoogleAdsPage(referrer)) return false;
    } catch { return false; }
  }
  if (document.getElementById(GOOGLE_ADS_SCRIPT_ID) || document.querySelector(`script[src*="googletagmanager.com/"][src*="${GOOGLE_ADS_ID}"]`)) return false;
  window.dataLayer = window.dataLayer || [];
  // Preserve the arguments object used by the Google-provided bootstrap.
  // eslint-disable-next-line prefer-rest-params
  window.gtag = window.gtag || function () { window.dataLayer!.push(arguments); };
  // Basic consent mode: no Google Ads request before opt-in. Personalization stays off.
  window.gtag("consent", "default", { ad_storage: "denied", analytics_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  window.gtag("set", { allow_ad_personalization_signals: false, allow_google_signals: false, ads_data_redaction: true, url_passthrough: false, page_location: `${url.origin}${url.pathname}`, page_referrer: "", page_title: "Family Weather" });
  window.gtag("consent", "update", { ad_storage: "granted", ad_user_data: "granted", analytics_storage: "denied", ad_personalization: "denied" });
  window.gtag("js", new Date());
  // This is the current Google-provided Google-only tag, not the older gtag/js format.
  // Do not add a config command or a second tag. No conversion is fired here.
  const script = document.createElement("script");
  script.id = GOOGLE_ADS_SCRIPT_ID;
  script.async = true;
  script.referrerPolicy = "no-referrer";
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GOOGLE_ADS_ID}`;
  window.familyWeatherGoogleAdsLoaded = true;
  document.head.appendChild(script);
  return true;
}

export function revokeGoogleAdsMeasurement(): void {
  if (!window.familyWeatherGoogleAdsLoaded) return;
  window.gtag?.("consent", "update", { ad_storage: "denied", analytics_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  // Removing a script node does not remove its listeners. A new document does.
  window.location.reload();
}
