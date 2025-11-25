/**
 * API Route: Teleoperator Detail
 * DELETE: Delete a teleoperator
 */

import { NextRequest, NextResponse } from "next/server";
import { deleteTeleoperator } from "@/lib/repositories/teleoperators";
import { getUserClaims, requireRole } from "@/lib/utils/auth";

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const teleoperatorId = params.id;
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    requireRole(claims, ["superadmin", "partner_admin"]);

    await deleteTeleoperator(teleoperatorId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[api] DELETE /api/v1/teleoperators/[id] - Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete teleoperator" },
      { status: error.statusCode || 500 },
    );
  }
}




