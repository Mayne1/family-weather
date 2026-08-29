import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://thefamilyweather.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Family Weather — Plan Around What Matters",
  description:
    "Choose the best time for your event, understand the weather risks and keep everyone informed.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Family Weather",
    title: "Family Weather — Plan Around What Matters",
    description: "Choose the best time for your event, understand the weather risks and keep everyone informed.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
