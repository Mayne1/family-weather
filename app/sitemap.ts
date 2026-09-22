import type { MetadataRoute } from "next";
import { weatherStories } from "./weather-stories/stories";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://thefamilyweather.com").replace(/\/+$/, "");
  return [
    { url: origin, changeFrequency: "daily", priority: 1 },
    { url: `${origin}/today`, changeFrequency: "daily", priority: 0.9 },
    { url: `${origin}/plan`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${origin}/weather-history`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${origin}/how-it-works`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${origin}/live`, changeFrequency: "daily", priority: 0.8 },
    { url: `${origin}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${origin}/faq`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${origin}/contact`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${origin}/pricing`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${origin}/weather-stories`, changeFrequency: "weekly", priority: 0.8 },
    ...weatherStories.map(({ slug }) => ({
      url: `${origin}/weather-stories/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
