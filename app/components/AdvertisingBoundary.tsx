"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { supportsAdvertising } from "../lib/adPolicy";

// Removing a script tag cannot unload Google's running code. Cross the
// public/private boundary using a fresh document, including back/forward and
// programmatic Next navigation. Never render private content into an ad document.
export default function AdvertisingBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [initialAdvertising] = useState(() => supportsAdvertising(pathname));
  const needsNewDocument = initialAdvertising !== supportsAdvertising(pathname);

  useEffect(() => {
    if (needsNewDocument) window.location.reload();
  }, [needsNewDocument]);

  useEffect(() => {
    function navigate(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.defaultPrevented) return;
      const anchor = event.target instanceof Element ? event.target.closest('a') : null;
      if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
      const target = new URL(anchor.href, window.location.href);
      if (target.origin !== window.location.origin || supportsAdvertising(target.pathname) === initialAdvertising) return;
      event.preventDefault();
      event.stopPropagation();
      window.location.assign(target.href);
    }
    document.addEventListener('click', navigate, true);
    return () => document.removeEventListener('click', navigate, true);
  }, [initialAdvertising]);

  return needsNewDocument ? null : children;
}
