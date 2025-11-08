import { NextRequest, NextResponse } from "next/server";

const ADMIN_TOKEN = process.env.ADMIN_BEARER_TOKEN;

export function requireAdminAuth(request: NextRequest) {
  const headerToken =
    request.headers.get("admin_bearer_token") ??
    request.headers.get("ADMIN_BEARER_TOKEN") ??
    request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim();

  if (!ADMIN_TOKEN) {
    return NextResponse.json(
      { error: "Server misconfigured: missing ADMIN_BEARER_TOKEN env var." },
      { status: 500 },
    );
  }

  if (!headerToken || headerToken !== ADMIN_TOKEN) {
    return NextResponse.json(
      { error: "Unauthorized. ADMIN_BEARER_TOKEN header required." },
      { status: 401 },
    );
  }

  return null;
}

