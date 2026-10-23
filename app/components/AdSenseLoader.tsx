"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { supportsAdvertising } from "../lib/adPolicy";

export default function AdSenseLoader() {
  const pathname = usePathname();
  if (!supportsAdvertising(pathname)) return null;

  return (
    <Script
      async
      crossOrigin="anonymous"
      strategy="afterInteractive"
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7197347169057891"
    />
  );
}
