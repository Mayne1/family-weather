import type { Metadata } from "next";
import "./globals.css";
import AdSenseLoader from "./components/AdSenseLoader";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://thefamilyweather.com").replace(/\/+$/, "");
const title = "Free Invitations, RSVPs & Weather Event Planning | Family Weather";
const description =
  "Plan events with free digital invitations, shareable links, announcements and RSVP tracking. Check live forecasts, useful weather windows and five-year weather history.";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Family Weather",
      url: siteUrl,
      email: "contact@thefamilyweather.com",
      slogan: "Plan more. Worry less.",
      sameAs: [
        "https://www.instagram.com/thefamilyweather/",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Family Weather",
      description,
      publisher: { "@id": `${siteUrl}/#organization` },
    },
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#application`,
      name: "Family Weather",
      url: siteUrl,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Any",
      description,
      featureList: [
        "Free weather checks for outdoor activities and events",
        "Live forecasts and useful weather time windows",
        "Five-year same-date historical weather comparisons",
        "Free digital invitations and shareable invitation links",
        "Event announcements and RSVP tracking",
        "Optional event presentation upgrades",
      ],
      provider: { "@id": `${siteUrl}/#organization` },
    },
  ],
};

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Family Weather", statusBarStyle: "default" },
  icons: { apple: "/notification-icon-192.png" },
  metadataBase: new URL(siteUrl),
  applicationName: "Family Weather",
  keywords: [
    "weather-aware event planning",
    "free event invitations",
    "digital invitation links",
    "RSVP tracking",
    "weather planning",
    "outdoor activity planner",
    "five-year weather history",
  ],
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Family Weather",
    locale: "en_US",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
        <AdSenseLoader />
        {children}
      </body>
    </html>
  );
}
