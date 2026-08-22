import { NextRequest, NextResponse } from "next/server";

const API = "http://127.0.0.1:3000/weather";

export async function GET(request: NextRequest) {
  try {
    const requestedLat = Number(request.nextUrl.searchParams.get("lat"));
    const requestedLon = Number(request.nextUrl.searchParams.get("lon"));
    const hasCoordinates = Number.isFinite(requestedLat) && Number.isFinite(requestedLon);
    const lat = hasCoordinates ? requestedLat : 37.9177;
    const lon = hasCoordinates ? requestedLon : -121.3123;
    const [currentResponse, forecastResponse] = await Promise.all([
      fetch(`${API}/current?lat=${lat}&lon=${lon}`, { cache: "no-store" }),
      fetch(`${API}/forecast10?lat=${lat}&lon=${lon}`, { cache: "no-store" }),
    ]);
    if (!currentResponse.ok || !forecastResponse.ok) throw new Error("Weather service unavailable");
    const [current, forecast] = await Promise.all([currentResponse.json(), forecastResponse.json()]);
    let label = hasCoordinates ? "Your location" : "Stockton, California";
    if (hasCoordinates) {
      try {
        const pointResponse = await fetch(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`, {
          headers: { "User-Agent": "FamilyWeather/1.0 (thefamilyweather.com)" },
          cache: "no-store",
        });
        const point = await pointResponse.json();
        const place = point?.properties?.relativeLocation?.properties;
        if (pointResponse.ok && place?.city) label = `${place.city}, ${place.state || ""}`.replace(/, $/, "");
      } catch {
        // Weather still works if the friendly place-name lookup does not.
      }
    }
    return NextResponse.json({ ok: true, label, lat, lon, current: current.current, days: forecast.days?.slice(0, 5) || [], source: forecast.source });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Weather service unavailable" }, { status: 502 });
  }
}
