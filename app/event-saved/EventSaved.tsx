"use client";

import { useEffect, useRef } from "react";
import { finishEventConversion } from "../lib/googleAdsEventConversion";

export default function EventSaved() {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    finishEventConversion(process.env.NEXT_PUBLIC_GOOGLE_ADS_EVENT_CONVERSION_LABEL);
  }, []);
  return null;
}
