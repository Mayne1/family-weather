"use client";

import { useEffect } from "react";
import { getValidSession } from "../lib/firebaseAuth";
import { canMeasureGoogleAdsConversion } from "../lib/googleAdsConversionBridge";
import { preparePurchaseConversion } from "../lib/googleAdsPurchaseConversion";

export default function PurchaseConversionReturn({ eventId }: { eventId: string }) {
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const sessionId = query.get("session_id") || "";
    if (query.get("payment") !== "processing" || !/^cs_live_[A-Za-z0-9]{1,240}$/.test(sessionId) || !canMeasureGoogleAdsConversion()) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function verify(attempt = 0) {
      try {
        const session = await getValidSession();
        if (!session || controller.signal.aborted) return;
        const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/purchase-receipt?session_id=${encodeURIComponent(sessionId)}`, {
          headers: { Authorization: `Bearer ${session.idToken}` }, cache: "no-store", signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (response.status === 202 && attempt < 5) { timer = setTimeout(() => { void verify(attempt + 1); }, 2000); return; }
        const data = await response.json();
        if (!response.ok || !data.ok || typeof data.receipt?.transaction_id !== "string" || controller.signal.aborted) return;
        preparePurchaseConversion(eventId, data.receipt.transaction_id);
      } catch { /* Measurement failures do not interrupt the event page or payment. */ }
    }
    void verify();
    return () => { controller.abort(); if (timer) clearTimeout(timer); };
  }, [eventId]);
  return null;
}
