import type { Metadata } from "next";
import "./globals.css";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://thefamilyweather.com").replace(/\/+$/, "");
const title = "Free Event Weather Planner & Digital Invitations | Family Weather";
const description =
  "Plan event weather free with live forecasts and five-year same-date history, then create digital invitations, share one link and manage RSVPs.";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Family Weather",
      url: siteUrl,
      email: "contact@thefamilyweather.com",
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
        "Weather-aware event planning",
        "Live forecasts and current conditions",
        "Five-year historical weather patterns",
        "Digital invitations",
        "RSVP management",
      ],
      provider: { "@id": `${siteUrl}/#organization` },
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Family Weather",
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
      <head>
        <script
          async
          crossOrigin="anonymous"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7197347169057891"
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
        {children}
      </body>
    </html>
  );
}
