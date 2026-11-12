import { canMeasureGoogleAdsConversion, navigateWithoutReferrer, runConversionBridge } from "./googleAdsConversionBridge.ts";

// Owner-provided Purchase action. Never use this for a free event or checkout click.
export const PURCHASE_CONVERSION_DESTINATION = "AW-951353708/HVkECKnQ2rYdEOyC0sUD";
export const PURCHASE_CONVERSION_PENDING_KEY = "family-weather-purchase-conversion-v1";
export const PURCHASE_CONVERSION_SEEN_PREFIX = "family-weather-measured-purchase-v1:";
const transactionPattern = /^[a-f0-9]{64}$/;
type PendingPurchase = { transactionId: string; returnPath: string; createdAt: number };

export function preparePurchaseConversion(eventId: string, transactionId: string): boolean {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(eventId) || !transactionPattern.test(transactionId)) return false;
  try {
    if (!canMeasureGoogleAdsConversion() || window.sessionStorage.getItem(PURCHASE_CONVERSION_SEEN_PREFIX + transactionId)) return false;
    const pending: PendingPurchase = { transactionId, returnPath: `/events/${eventId}`, createdAt: Date.now() };
    window.sessionStorage.setItem(PURCHASE_CONVERSION_PENDING_KEY, JSON.stringify(pending));
    navigateWithoutReferrer("/purchase-complete");
    return true;
  } catch { return false; }
}

export function consumePendingPurchase(storage: Pick<Storage, "getItem" | "removeItem" | "setItem">, now = Date.now()): PendingPurchase | null {
  try {
    const raw = storage.getItem(PURCHASE_CONVERSION_PENDING_KEY);
    storage.removeItem(PURCHASE_CONVERSION_PENDING_KEY);
    const pending = JSON.parse(raw || "null");
    if (!transactionPattern.test(pending?.transactionId || "") || typeof pending?.returnPath !== "string" || !/^\/events\/[A-Za-z0-9_-]{1,128}$/.test(pending.returnPath)) return null;
    if (typeof pending.createdAt !== "number" || pending.createdAt > now || now - pending.createdAt >= 120000) return null;
    if (storage.getItem(PURCHASE_CONVERSION_SEEN_PREFIX + pending.transactionId)) return null;
    return pending;
  } catch { return null; }
}

export function finishPurchaseConversion(): void {
  const url = new URL(window.location.href);
  if (url.pathname !== "/purchase-complete" || url.search || url.hash) { navigateWithoutReferrer("/events"); return; }
  let pending: PendingPurchase | null = null;
  try { pending = consumePendingPurchase(window.sessionStorage); } catch { /* Fail closed. */ }
  if (!pending) { navigateWithoutReferrer("/events"); return; }
  try {
    if (!canMeasureGoogleAdsConversion()) { navigateWithoutReferrer(pending.returnPath); return; }
    window.sessionStorage.setItem(PURCHASE_CONVERSION_SEEN_PREFIX + pending.transactionId, "1");
  } catch { navigateWithoutReferrer(pending.returnPath); return; }
  // Stable opaque ID is also deduplicated by Google across tabs or sessions.
  // No price, customer data, Stripe session ID or event identifier is sent.
  runConversionBridge(PURCHASE_CONVERSION_DESTINATION, pending.transactionId, pending.returnPath);
}
