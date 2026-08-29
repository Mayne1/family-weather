import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "../../../lib/serverConfig";

async function forward(request: NextRequest, id: string, method: "GET" | "DELETE") {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "missing_bearer_token" }, { status: 401 });
  }

  const response = await fetch(backendUrl(`/events/${encodeURIComponent(id)}/manage`), {
    method,
    headers: { Authorization: authorization },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({ ok: false, error: "invalid_backend_response" }));
  return NextResponse.json(data, { status: response.status });
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return forward(request, id, "GET");
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return forward(request, id, "DELETE");
}
