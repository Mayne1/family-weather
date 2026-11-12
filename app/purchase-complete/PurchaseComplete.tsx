"use client";

import { useEffect, useRef } from "react";
import { finishPurchaseConversion } from "../lib/googleAdsPurchaseConversion";

export default function PurchaseComplete() {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    finishPurchaseConversion();
  }, []);
  return null;
}
