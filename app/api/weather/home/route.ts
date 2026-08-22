import { NextResponse } from "next/server";

const API = "http://127.0.0.1:3000/weather";

export async function GET() {
  try {
    const lat = 37.9177;
    const lon = -121.3123;
    const [currentResponse, forecastResponse] = await Promise.all([
      fetch(`${API}/current?lat=${lat}&lon=${lon}`, { cache: "no-store" }),
      fetch(`${API}/forecast10?lat=${lat}&lon=${lon}`, { cache: "no-store" }),
    ]);
    if (!currentResponse.ok || !forecastResponse.ok) throw new Error("Weather service unavailable");
    const [current, forecast] = await Promise.all([currentResponse.json(), forecastResponse.json()]);
    return NextResponse.json({ ok: true, current: current.current, days: forecast.days?.slice(0, 4) || [], source: forecast.source });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Weather service unavailable" }, { status: 502 });
  }
}
