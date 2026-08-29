import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://thefamilyweather.com";
  return [{ url: origin, lastModified: new Date(), changeFrequency: "daily", priority: 1 }];
}
