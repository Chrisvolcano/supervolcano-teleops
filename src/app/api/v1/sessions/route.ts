/**
 * API Route: Sessions
 * GET: List sessions
 * POST: Start a new session
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessions, getTodaySessionAtLocation } from "@/lib/repositories/sessions";
import { getUserClaims, requireRole } from "@/lib/utils/auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    requireRole(claims, ["superadmin", "partner_admin", "org_manager", "oem_teleoperator"]);

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const teleoperatorId = searchParams.get("teleoperatorId");
    const locationId = searchParams.get("locationId");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const today = searchParams.get("today"); // If true, get today's session at location

    // Build filters
    const filters: any = {};
    if (organizationId) {
      filters.organizationId = organizationId;
    } else if (claims.organizationId) {
      // If no org specified, filter by user's org
      filters.organizationId = claims.organizationId;
    }

    if (teleoperatorId) {
      filters.teleoperatorId = teleoperatorId;
    } else if (claims.role === "oem_teleoperator" && claims.teleoperatorId) {
      // If no teleoperator specified, filter by current user
      filters.teleoperatorId = claims.teleoperatorId;
    }

    if (locationId) {
      filters.locationId = locationId;
    }

    if (limit) {
      filters.limit = limit;
    }

    // If today=true and locationId and teleoperatorId are provided, get today's session
    if (today === "true" && locationId && teleoperatorId) {
      const sessionResult = await getTodaySessionAtLocation(teleoperatorId, locationId);
      if (sessionResult.success) {
        return NextResponse.json({ 
          sessions: sessionResult.session ? [sessionResult.session] : [] 
        });
      } else {
        return NextResponse.json({ error: sessionResult.error }, { status: 500 });
      }
    }

    try {
      const result = await getSessions(filters);

      if (result.success) {
        return NextResponse.json({ sessions: result.sessions || [] });
      } else {
        console.error("[api] getSessions failed:", result.error);
        // Return empty array instead of error to prevent UI breakage
        return NextResponse.json({ sessions: [] });
      }
    } catch (error: any) {
      console.error("[api] Error in getSessions:", error);
      // Return empty array instead of error to prevent UI breakage
      return NextResponse.json({ sessions: [] });
    }
  } catch (error: any) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// POST handler removed - sessions are now auto-created when tasks are completed

