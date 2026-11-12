import { GOOGLE_ADS_ID } from "./googleAds.ts";
import { canMeasureGoogleAdsConversion, navigateWithoutReferrer, runConversionBridge } from "./googleAdsConversionBridge.ts";

export const EVENT_CONVERSION_PENDING_KEY = "family-weather-event-conversion-v1";
export const EVENT_CONVERSION_PATH = "/event-saved";
const pendingLifetime = 2 * 60 * 1000;
const eventIdPattern = /^[A-Za-z0-9_-]{1,128}$/;
const transactionPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PendingConversion = { destination: string; transactionId: string; returnPath: string; createdAt: number };

export function eventConversionDestination(label: string | undefined): string | null {
  // Never substitute the known About Us or Purchase actions for a free event save.
  if (!label || ["-NJ0CM6qjrYdEOyC0sUD", "HVkECKnQ2rYdEOyC0sUD"].includes(label) || !/^[A-Za-z0-9_-]{10,128}$/.test(label)) return null;
  return `${GOOGLE_ADS_ID}/${label}`;
}

/** Called only after the application's authenticated save succeeds. */
export function continueAfterEventSave(eventId: string, label: string | undefined): void {
  const returnPath = `/events/${encodeURIComponent(eventId)}/invitation`;
  const destination = eventConversionDestination(label);
  try {
    if (eventIdPattern.test(eventId) && destination && canMeasureGoogleAdsConversion()) {
      const pending: PendingConversion = { destination, transactionId: crypto.randomUUID(), returnPath, createdAt: Date.now() };
      window.sessionStorage.setItem(EVENT_CONVERSION_PENDING_KEY, JSON.stringify(pending));
      navigateWithoutReferrer(EVENT_CONVERSION_PATH);
      return;
    }
  } catch { /* Tracking must never prevent access to the saved invitation. */ }
  navigateWithoutReferrer(returnPath);
}

export function consumePendingConversion(storage: Pick<Storage, "getItem" | "removeItem">, destination: string | null, now = Date.now()): PendingConversion | null {
  try {
    const raw = storage.getItem(EVENT_CONVERSION_PENDING_KEY);
    // Consume before loading the tag, so reload, Back and repeated effects cannot resend.
    storage.removeItem(EVENT_CONVERSION_PENDING_KEY);
    const pending = JSON.parse(raw || "null");
    if (!destination || pending?.destination !== destination || !transactionPattern.test(pending?.transactionId || "")) return null;
    if (typeof pending.createdAt !== "number" || pending.createdAt > now || now - pending.createdAt >= pendingLifetime) return null;
    if (typeof pending.returnPath !== "string" || !/^\/events\/[A-Za-z0-9_-]{1,128}\/invitation$/.test(pending.returnPath)) return null;
    return pending;
  } catch { return null; }
}

/** The clean bridge has no form fields, event identifiers or private query parameters. */
export function finishEventConversion(label: string | undefined): void {
  const url = new URL(window.location.href);
  if (url.pathname !== EVENT_CONVERSION_PATH || url.search || url.hash) {
    navigateWithoutReferrer("/events");
    return;
  }
  let pending: PendingConversion | null = null;
  try { pending = consumePendingConversion(window.sessionStorage, eventConversionDestination(label)); } catch { /* Storage denied. */ }
  if (!pending) { navigateWithoutReferrer("/events"); return; }
  runConversionBridge(pending.destination, pending.transactionId, pending.returnPath);
}
