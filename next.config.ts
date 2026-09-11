import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        // AdSense loads changing HTTPS resources and frames. Google permits a
        // more permissive policy; allowing HTTPS here preserves static generation
        // instead of requiring a fresh nonce and dynamic render for every page.
        { key: "Content-Security-Policy", value: "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http:; connect-src 'self' https:; frame-src https:; font-src 'self' data: https:; upgrade-insecure-requests" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-DNS-Prefetch-Control", value: "off" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        { key: "Origin-Agent-Cluster", value: "?1" },
        { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      ],
    }];
  },
};

export default nextConfig;
