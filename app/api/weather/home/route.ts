import { NextRequest, NextResponse } from "next/server";

const API = "http://127.0.0.1:3000/weather";
const NWS_HEADERS = { "User-Agent": "FamilyWeather/1.0 (thefamilyweather.com)", Accept: "application/geo+json" };

type NwsPeriod = { startTime:string; isDaytime:boolean; temperature:number; probabilityOfPrecipitation?:{value?:number|null}; windSpeed?:string; shortForecast?:string };
const maxWind = (value="0") => Math.round(Math.max(...(value.match(/\d+(?:\.\d+)?/g)?.map(Number) || [0])));
function weatherCode(summary="") { const text=summary.toLowerCase(); if(/thunder/.test(text))return 211;if(/snow|sleet|ice/.test(text))return 601;if(/rain|shower|drizzle/.test(text))return 500;if(/fog|haze|smoke/.test(text))return 741;if(/mostly cloudy/.test(text))return 803;if(/partly cloudy|partly sunny/.test(text))return 802;if(/mostly sunny|few clouds/.test(text))return 801;if(/sunny|clear/.test(text))return 800;return 802; }
function buildDays(periods:NwsPeriod[]) { const nights=periods.filter(p=>!p.isDaytime); return periods.filter(p=>p.isDaytime).slice(0,5).map(p=>{const date=p.startTime.slice(0,10);const night=nights.find(n=>n.startTime.slice(0,10)===date);const shortForecast=p.shortForecast||"Forecast available";return {date,weather_code:weatherCode(shortForecast),temp_max_f:Math.round(p.temperature),temp_min_f:Math.round(night?.temperature??p.temperature),precip_prob_pct:Math.round(p.probabilityOfPrecipitation?.value||0),wind_max_mph:maxWind(p.windSpeed),shortForecast};}); }

export async function GET(request: NextRequest) {
  try {
    const requestedLat = Number(request.nextUrl.searchParams.get("lat"));
    const requestedLon = Number(request.nextUrl.searchParams.get("lon"));
    const hasCoordinates = Number.isFinite(requestedLat) && Number.isFinite(requestedLon);
    const lat = hasCoordinates ? requestedLat : 37.9177;
    const lon = hasCoordinates ? requestedLon : -121.3123;
    const [currentResponse, pointResponse] = await Promise.all([
      fetch(`${API}/current?lat=${lat}&lon=${lon}`, { cache: "no-store" }),
      fetch(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`, { headers:NWS_HEADERS, cache:"no-store" }),
    ]);
    if (!currentResponse.ok || !pointResponse.ok) throw new Error("Weather service unavailable");
    const [current, point] = await Promise.all([currentResponse.json(), pointResponse.json()]);
    const forecastUrl=point?.properties?.forecast;
    if(!forecastUrl) throw new Error("Official forecast unavailable");
    const forecastResponse=await fetch(forecastUrl,{headers:NWS_HEADERS,cache:"no-store"});
    if(!forecastResponse.ok) throw new Error("Official forecast unavailable");
    const forecast=await forecastResponse.json();
    const days=buildDays(forecast?.properties?.periods||[]);
    if(!days.length) throw new Error("Official forecast unavailable");
    const place=point?.properties?.relativeLocation?.properties;
    const label=place?.city?`${place.city}, ${place.state||""}`.replace(/, $/,""):(hasCoordinates?"Your location":"Stockton, California");
    return NextResponse.json({ok:true,label,lat,lon,current:current.current,days,source:"nws"});
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Weather service unavailable" }, { status: 502 });
  }
}
