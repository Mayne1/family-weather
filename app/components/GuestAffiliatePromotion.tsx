"use client";
import { useEffect, useState, type ReactNode } from "react";
import { supportsEventAffiliate } from "../lib/affiliatePromotions";
import AffiliatePromotion from "./AffiliatePromotion";

type VerifiedGuest = { token: string; presentation?: string; valid: boolean };

export default function GuestAffiliatePromotion({ token, children }: { token: string; children?: ReactNode }) {
  const [verified, setVerified] = useState<VerifiedGuest | null>(null);
  useEffect(() => {
    let active = true;
    let request: AbortController | null = null;
    const refresh = async () => {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      setVerified(null);
      if (!token || document.visibilityState === "hidden") return;
      try {
        const response = await fetch(`/api/invites/${encodeURIComponent(token)}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (active && !controller.signal.aborted && response.ok && data.ok) {
          setVerified({ token, presentation: data.presentation, valid: data.valid === true });
        }
      } catch { /* A failed refresh never restores an old advertisement. */ }
    };
    void refresh();
    // Recheck long-lived foreground tabs without background polling.
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      request?.abort();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [token]);
  return verified?.token === token && supportsEventAffiliate(verified.presentation, verified.valid)
    ? <><AffiliatePromotion />{children}</> : null;
}
