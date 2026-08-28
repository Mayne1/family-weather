import { NextRequest, NextResponse } from "next/server";
import { searchLocations } from "../../../lib/location";

export async function GET(request: NextRequest) {
  const query = String(request.nextUrl.searchParams.get("q") || "").trim();
  if (query.length < 2) return NextResponse.json({ ok: true, suggestions: [] });
  try {
    const suggestions = await searchLocations(query, 6);
    return NextResponse.json(
      { ok: true, suggestions },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Location search unavailable" }, { status: 502 });
  }
}
