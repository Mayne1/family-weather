import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "../../../../../lib/serverConfig";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_ARTWORK_BYTES = 8 * 1024 * 1024;

function matchesImageType(bytes: Uint8Array, mime: string) {
  if (mime === "image/png") return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  if (mime === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/webp") return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

function authorization(request: NextRequest) {
  const value = request.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value : null;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = authorization(request);
  if (!auth) return NextResponse.json({ ok: false, error: "Sign in to view artwork." }, { status: 401 });
  const { id } = await context.params;
  const response = await fetch(backendUrl(`/events/${encodeURIComponent(id)}/invitation/artwork/manage`), {
    headers: { Authorization: auth },
    cache: "no-store",
  });
  if (!response.ok) return new NextResponse(null, { status: response.status });
  const artwork = await response.arrayBuffer();
  return new NextResponse(artwork, {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("content-type") || "image/png",
      "Cache-Control": "private, no-store",
    },
  });
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = authorization(request);
  if (!auth) return NextResponse.json({ ok: false, error: "Sign in before uploading artwork." }, { status: 401 });
  const mime = String(request.headers.get("content-type") || "").split(";", 1)[0].toLowerCase();
  if (!ALLOWED_TYPES.has(mime)) {
    return NextResponse.json({ ok: false, error: "Upload a PNG, JPEG, or WebP image." }, { status: 415 });
  }
  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (declaredSize > MAX_ARTWORK_BYTES) {
    return NextResponse.json({ ok: false, error: "Invitation artwork must be 8 MB or smaller." }, { status: 413 });
  }
  const artwork = await request.arrayBuffer();
  if (!artwork.byteLength) return NextResponse.json({ ok: false, error: "Choose an invitation image first." }, { status: 400 });
  if (artwork.byteLength > MAX_ARTWORK_BYTES) {
    return NextResponse.json({ ok: false, error: "Invitation artwork must be 8 MB or smaller." }, { status: 413 });
  }
  if (!matchesImageType(new Uint8Array(artwork), mime)) {
    return NextResponse.json({ ok: false, error: "The uploaded file does not match its image type." }, { status: 415 });
  }
  const { id } = await context.params;
  const response = await fetch(backendUrl(`/events/${encodeURIComponent(id)}/invitation/artwork`), {
    method: "PUT",
    headers: { Authorization: auth, "Content-Type": mime, "Content-Length": String(artwork.byteLength) },
    body: artwork,
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    const error = data?.error === "artwork_too_large"
      ? "Invitation artwork must be 8 MB or smaller."
      : data?.error === "invalid_artwork_type"
        ? "Upload a PNG, JPEG, or WebP image."
        : "Invitation artwork could not be saved.";
    return NextResponse.json({ ok: false, error }, { status: response.status });
  }
  return NextResponse.json({ ok: true, has_custom_artwork: true });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = authorization(request);
  if (!auth) return NextResponse.json({ ok: false, error: "Sign in before removing artwork." }, { status: 401 });
  const { id } = await context.params;
  const response = await fetch(backendUrl(`/events/${encodeURIComponent(id)}/invitation/artwork`), {
    method: "DELETE",
    headers: { Authorization: auth },
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  return NextResponse.json(
    response.ok && data?.ok ? { ok: true, has_custom_artwork: false } : { ok: false, error: "Invitation artwork could not be removed." },
    { status: response.status },
  );
}
