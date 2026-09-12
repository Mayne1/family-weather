import type { MetadataRoute } from "next";
import { eventWeatherPlanningPages } from "./event-weather-planning/events";
import { weatherPlanningDestinations } from "./weather-planning/destinations";
import { weatherStories } from "./weather-stories/stories";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://thefamilyweather.com").replace(/\/+$/, "");
  return [
    { url: origin, changeFrequency: "daily", priority: 1 },
    { url: `${origin}/event-weather-planning`, changeFrequency: "weekly", priority: 0.8 },
    ...eventWeatherPlanningPages.map(({ slug }) => ({
      url: `${origin}/event-weather-planning/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${origin}/weather-stories`, changeFrequency: "weekly", priority: 0.8 },
    ...weatherStories.map(({ slug }) => ({
      url: `${origin}/weather-stories/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${origin}/weather-planning`, changeFrequency: "weekly", priority: 0.8 },
    ...weatherPlanningDestinations.map(({ slug }) => ({
      url: `${origin}/weather-planning/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
