"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { supportsAdvertising, validAdSlot } from "../lib/adPolicy";

const slot = validAdSlot(process.env.NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT);

function AdUnit() {
  const element = useRef<HTMLModElement>(null);
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    // Wait for a visible, sized container; do not refresh on weather updates.
    const observer = new ResizeObserver(() => {
      if (!node.isConnected || node.getBoundingClientRect().width === 0 || node.dataset.requested) return;
      node.dataset.requested = 'true';
      try {
        const adsWindow = window as Window & { adsbygoogle?: object[] };
        (adsWindow.adsbygoogle = adsWindow.adsbygoogle || []).push({});
      } catch {
        // Ad blocking must never break weather, navigation or event features.
      }
      observer.disconnect();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <aside className="fwAdvertisement" aria-label="Advertisements">
    <small>Advertisements</small>
    <ins ref={element} className="adsbygoogle" style={{ display: 'block' }}
      data-ad-client="ca-pub-7197347169057891" data-ad-slot={slot!}
      data-ad-format="auto" data-full-width-responsive="true" />
  </aside>;
}

export default function DisplayAdvertisement() {
  const pathname = usePathname();
  // No fake ads or empty placeholder boxes while the account has no unit ID.
  if (!slot || !supportsAdvertising(pathname)) return null;
  return <AdUnit key={pathname} />;
}
