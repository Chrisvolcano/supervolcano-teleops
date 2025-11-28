/**
 * API Route: Organization Teleoperators
 * GET: Get all teleoperators for a specific organization
 */

import { NextRequest, NextResponse } from "next/server";
import { getTeleoperatorsByOrganization } from "@/lib/repositories/teleoperators";
import { getUserClaims, requireRole } from "@/lib/utils/auth";

export const dynamic = 'force-dynamic';

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

    requireRole(claims, ["superadmin", "partner_admin"]);

    const teleoperators = await getTeleoperatorsByOrganization(organizationId);

    return NextResponse.json({ teleoperators });
  } catch (error: any) {
    console.error("[api] GET /api/v1/organizations/[id]/teleoperators - Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch teleoperators" },
      { status: error.statusCode || 500 },
    );
  }
}




