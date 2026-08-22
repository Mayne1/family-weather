import { NextRequest, NextResponse } from "next/server";

const API = "http://127.0.0.1:3000/weather";

type ForecastDay = {
  date: string;
  weather_code: number;
  temp_max_f: number;
  temp_min_f: number;
  precip_prob_pct: number;
  wind_max_mph: number;
  shortForecast?: string;
};

function clamp(value: number, low = 0, high = 100) {
  return Math.max(low, Math.min(high, Math.round(value)));
}

function buildRecommendation(day: ForecastDay, space: string, activity: string) {
  const exposure = space === "indoor" ? 0.2 : space === "both" ? 0.6 : 1;
  const heatPenalty = Math.max(0, day.temp_max_f - 84) * 1.7 * exposure;
  const coldPenalty = Math.max(0, 58 - day.temp_max_f) * 1.2 * exposure;
  const rainPenalty = day.precip_prob_pct * 0.55 * exposure;
  const windPenalty = Math.max(0, day.wind_max_mph - 12) * 2 * exposure;
  const activityPenalty = activity === "park day" || activity === "game" ? heatPenalty * 0.25 : 0;
  const score = clamp(100 - heatPenalty - coldPenalty - rainPenalty - windPenalty - activityPenalty);

  let bestWindow = "12–3 PM";
  if (day.temp_max_f >= 90) bestWindow = "5–8 PM";
  else if (day.temp_max_f >= 82) bestWindow = "4–7 PM";
  else if (day.temp_max_f < 65) bestWindow = "1–4 PM";
  if (space === "indoor") bestWindow = "Your planned time";

  const advice = [];
  if (day.precip_prob_pct < 20) advice.push({ tone: "good", title: "Rain is unlikely", copy: `Only a ${day.precip_prob_pct}% chance is currently forecast.` });
  else if (day.precip_prob_pct < 50) advice.push({ tone: "warn", title: "Keep cover nearby", copy: `${day.precip_prob_pct}% rain chance—have a quick backup ready.` });
  else advice.push({ tone: "warn", title: "Use the indoor backup", copy: `${day.precip_prob_pct}% rain chance makes exposure the main concern.` });

  if (day.temp_max_f >= 90 && space !== "indoor") advice.push({ tone: "warn", title: "Plan for heat", copy: `The high is near ${day.temp_max_f}°. Shade and cold drinks matter.` });
  else advice.push({ tone: "good", title: "Temperature is manageable", copy: `The forecast high is ${day.temp_max_f}° with a low near ${day.temp_min_f}°.` });

  if (day.wind_max_mph <= 12) advice.push({ tone: "good", title: "Wind stays manageable", copy: `Peak wind is around ${day.wind_max_mph} mph.` });
  else advice.push({ tone: "warn", title: "Secure lightweight items", copy: `Wind could reach ${day.wind_max_mph} mph.` });

  return { score, bestWindow, advice };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const location = String(body.location || "95206");
    const zip = location.match(/\b\d{5}\b/)?.[0] || "95206";
    const date = String(body.date || new Date().toISOString().slice(0, 10));
    const activity = String(body.activity || "event");
    const space = ["indoor", "outdoor", "both"].includes(body.space) ? body.space : "outdoor";

    const geoResponse = await fetch(`${API}/geocode?zip=${encodeURIComponent(zip)}`, { cache: "no-store" });
    if (!geoResponse.ok) throw new Error("Location lookup failed");
    const geo = await geoResponse.json();

    const forecastResponse = await fetch(`${API}/forecast10?lat=${geo.lat}&lon=${geo.lon}`, { cache: "no-store" });
    if (!forecastResponse.ok) throw new Error("Forecast lookup failed");
    const forecast = await forecastResponse.json();
    const day: ForecastDay | undefined = forecast.days?.find((item: ForecastDay) => item.date === date) || forecast.days?.[0];
    if (!day) throw new Error("No forecast is available for that date");

    const recommendation = buildRecommendation(day, space, activity);
    return NextResponse.json({ ok: true, source: forecast.source, location: geo.label, day, space, activity, ...recommendation });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Weather service unavailable" }, { status: 502 });
  }
}
