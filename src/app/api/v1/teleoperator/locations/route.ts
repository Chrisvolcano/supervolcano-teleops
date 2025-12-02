/**
 * API Route: Teleoperator Assigned Locations
 * GET: Get all locations assigned to the current teleoperator with counts
 */

import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { getAssignedLocationsWithCounts } from "@/lib/repositories/teleoperators";
import { getUserClaims } from "@/lib/utils/auth";

export async function GET(request: NextRequest) {
  try {
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

    const locations = await getAssignedLocationsWithCounts(claims.organizationId);

    return NextResponse.json({ locations });
  } catch (error: any) {
    console.error("[api] GET /api/v1/teleoperator/locations - Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch locations" },
      { status: 500 },
    );
  }
}

