import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://thefamilyweather.com";
  const lastModified = new Date();
  return [
    { url: origin, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${origin}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}/sms-consent`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
