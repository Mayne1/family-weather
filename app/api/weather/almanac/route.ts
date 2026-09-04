import { NextRequest, NextResponse } from "next/server";
import { lookupAlmanac } from "../../../lib/almanac";
import { AmbiguousLocationError, resolveLocation } from "../../../lib/location";
import { enforceRateLimit } from "../../../lib/requestSecurity";

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, "weather-almanac", 20, 60_000);
  if (limited) return limited;
  try {
    const body = await request.json();
    const location = String(body.location || "95206").trim();
    const date = String(body.date || new Date().toISOString().slice(0, 10));
    const geo = await resolveLocation(location, body.resolvedLocation);
    const almanac = await lookupAlmanac(geo, date);
    return NextResponse.json({ ok: true, resolvedLocation: geo, almanac });
  } catch (error) {
    if (error instanceof AmbiguousLocationError) {
      return NextResponse.json({ ok: false, error: error.message, suggestions: error.suggestions }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Almanac lookup unavailable" }, { status: 502 });
  }
}
