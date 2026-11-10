// Approved Awin-generated link. Never append event, guest, location, or token data.
export const COZY_SPIRIT_AFFILIATE_URL = "https://www.awin1.com/cread.php?awinmid=130331&awinaffid=3149251&ued=https%3A%2F%2Fcozyspiritstudio.com%2F";

export function supportsPublicAffiliate(pathname: string): boolean {
  return ["/", "/today", "/plan", "/weather-history"].includes(pathname)
    || pathname === "/weather-stories" || pathname.startsWith("/weather-stories/");
}

export function supportsEventAffiliate(presentation: string | null | undefined, valid: boolean, hasError = false): boolean {
  // Fail closed until a valid guest response explicitly resolves the free tier.
  return valid === true && !hasError && presentation === "promoted";
}
