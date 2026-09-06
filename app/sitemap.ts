import type { MetadataRoute } from "next";
import { weatherPlanningDestinations } from "./weather-planning/destinations";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://thefamilyweather.com").replace(/\/+$/, "");
  return [
    { url: origin, changeFrequency: "daily", priority: 1 },
    { url: `${origin}/weather-planning`, changeFrequency: "weekly", priority: 0.8 },
    ...weatherPlanningDestinations.map(({ slug }) => ({
      url: `${origin}/weather-planning/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${origin}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}/sms-consent`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
