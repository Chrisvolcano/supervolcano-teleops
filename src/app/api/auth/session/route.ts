/**
 * AUTH SESSION ENDPOINT
 * Provides current session token for client-side API calls
 * More secure than exposing Firebase SDK client-side
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();

    // Try to get token from Authorization header first (for API routes calling this)
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({
        token: authHeader.split("Bearer ")[1],
      });
    }

    // Get session cookie (adjust based on your auth implementation)
    const sessionCookie = cookieStore.get("__session");

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // In production, verify the session token here
    // For now, return it directly
    return NextResponse.json({
      token: sessionCookie.value,
    });
  } catch (error: unknown) {
    console.error("[Auth Session] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

