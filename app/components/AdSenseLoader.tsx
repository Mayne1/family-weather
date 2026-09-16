"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

const exactPublicPages = new Set([
  "/",
  "/today",
  "/plan",
  "/weather-history",
  "/how-it-works",
  "/about",
  "/pricing",
]);

export default function AdSenseLoader() {
  const pathname = usePathname();
  const supportsAds = exactPublicPages.has(pathname) || pathname.startsWith("/weather-stories");
  if (!supportsAds) return null;

  return (
    <Script
      async
      crossOrigin="anonymous"
      strategy="afterInteractive"
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7197347169057891"
    />
  );
}
