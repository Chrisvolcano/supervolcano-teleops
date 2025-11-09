import { NextRequest, NextResponse } from "next/server";

import { adminAuth } from "@/lib/firebaseAdmin";

const ADMIN_TOKEN = process.env.ADMIN_BEARER_TOKEN;

export async function requireAdminAuth(request: NextRequest) {
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

  if (!headerToken) {
    return NextResponse.json(
      { error: "Unauthorized. ADMIN_BEARER_TOKEN header or admin ID token required." },
      { status: 401 },
    );
  }

  if (headerToken === ADMIN_TOKEN) {
    return null;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(headerToken);
    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Admin role required." }, { status: 403 });
    }
    return null;
  } catch (error) {
    console.error("Failed to verify admin token", error);
    return NextResponse.json(
      { error: "Unauthorized. Provide admin bearer token or admin ID token." },
      { status: 401 },
    );
  }
}

