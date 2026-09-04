import { NextRequest, NextResponse } from "next/server";

type RateEntry = { count: number; resetAt: number };

const rateEntries = new Map<string, RateEntry>();
let nextCleanupAt = 0;

function clientAddress(request: NextRequest) {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 96);
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return (forwarded || "unknown").slice(0, 96);
}

export function enforceRateLimit(request: NextRequest, bucket: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (now >= nextCleanupAt) {
    for (const [key, entry] of rateEntries) if (entry.resetAt <= now) rateEntries.delete(key);
    nextCleanupAt = now + 60_000;
  }

  const key = `${bucket}:${clientAddress(request)}`;
  const current = rateEntries.get(key);
  const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  entry.count += 1;
  rateEntries.set(key, entry);

  if (entry.count <= limit) return null;
  const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  return NextResponse.json(
    { ok: false, error: "Too many requests. Please wait a moment and try again." },
    { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(retryAfter) } },
  );
}
