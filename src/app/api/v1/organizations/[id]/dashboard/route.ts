/**
 * API Route: Organization Dashboard Data
 * GET: Get comprehensive dashboard data for an organization
 */

import { NextRequest, NextResponse } from "next/server";
import { getOrganizationDashboardData } from "@/lib/repositories/analytics";
import { getUserClaims, requireRole } from "@/lib/utils/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const organizationId = params.id;
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Allow org_manager, teleoperator, and admins
    requireRole(claims, ["superadmin", "admin", "partner_admin", "org_manager", "oem_teleoperator"]);

    // Verify user has access to this organization
    if (claims.role === "org_manager" || claims.role === "oem_teleoperator") {
      if (claims.organizationId !== organizationId) {
        return NextResponse.json({ error: "Access denied to this organization" }, { status: 403 });
      }
    }

    const result = await getOrganizationDashboardData(organizationId);

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to load dashboard data" }, { status: 500 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error: any) {
    console.error("[api] GET /api/v1/organizations/[id]/dashboard - Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch dashboard data" },
      { status: error.statusCode || 500 },
    );
  }
}

