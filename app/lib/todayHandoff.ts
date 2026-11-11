import type { LocationCandidate } from "./location";

export function currentWindText(wind: number | null | undefined, source?: string) {
  const label = source === "nws-grid-forecast" ? "Forecast wind"
    : source === "nws-observation" ? "Observed wind" : "Wind";
  return typeof wind === "number" && Number.isFinite(wind)
    ? `${label} ${Math.round(wind)} mph.` : `${label} unavailable.`;
}

export function todayPlannerHref(date: string, weather: { label?: string; lat?: number; lon?: number } | null) {
  const query = new URLSearchParams({ date });
  if (weather?.label) query.set("location", weather.label);
  if (typeof weather?.lat === "number" && typeof weather.lon === "number"
    && Number.isFinite(weather.lat) && Number.isFinite(weather.lon)) {
    query.set("lat", String(weather.lat));
    query.set("lon", String(weather.lon));
  }
  return `/plan?${query}`;
}

// Keep the forecast point, rather than geocoding a nearby city's label again.
export function handedOffLocation(label: string, lat: string, lon: string): LocationCandidate | null {
  if (!label.trim() || !lat.trim() || !lon.trim()) return null;
  const latitude = Number(lat), longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return {
    id: `today-${latitude}-${longitude}`, input: label, name: label, label,
    lat: latitude, lon: longitude, countryCode: "", country: "", admin1: "",
    locality: "", postalCode: "", type: "coordinates", provider: "family-weather", score: 1,
  };
}
