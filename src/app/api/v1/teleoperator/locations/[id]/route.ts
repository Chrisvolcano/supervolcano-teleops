/**
 * API Route: Teleoperator Location Detail
 * GET: Get location with all tasks and instructions (read-only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getLocationWithAllTasksAndInstructions } from "@/lib/repositories/locations";
import { canAccessLocation } from "@/lib/repositories/teleoperators";
import { getUserClaims } from "@/lib/utils/auth";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const locationId = params.id;
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = await getUserClaims(token);
    if (!claims || claims.role !== "oem_teleoperator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!claims.organizationId) {
      return NextResponse.json(
        { error: "Organization ID not found in claims" },
        { status: 400 },
      );
    }

    // Check access
    const hasAccess = await canAccessLocation(claims.organizationId, locationId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have access to this location" },
        { status: 403 },
      );
    }

    const location = await getLocationWithAllTasksAndInstructions(locationId);
    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    return NextResponse.json({ location });
  } catch (error: any) {
    console.error("[api] GET /api/v1/teleoperator/locations/[id] - Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch location" },
      { status: 500 },
    );
  }
}

