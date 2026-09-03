import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "../../../../lib/serverConfig";

async function forward(request: NextRequest, id: string, method: "GET" | "PUT") {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "Sign in to manage this invitation." }, { status: 401 });
  }

  const backendPath = method === "GET"
    ? `/events/${encodeURIComponent(id)}/invitation/manage`
    : `/events/${encodeURIComponent(id)}/invitation`;
  const response = await fetch(backendUrl(backendPath), {
    method,
    headers: {
      Authorization: authorization,
      ...(method === "PUT" ? { "Content-Type": "application/json" } : {}),
    },
    body: method === "PUT" ? JSON.stringify(await request.json()) : undefined,
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({ ok: false, error: "Invitation service returned an invalid response." }));
  return NextResponse.json(data, { status: response.status });
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return forward(request, id, "GET");
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return forward(request, id, "PUT");
}
