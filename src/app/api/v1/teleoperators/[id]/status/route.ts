/**
 * API Route: Update Teleoperator Status
 * PATCH: Update teleoperator status
 */

import { NextRequest, NextResponse } from "next/server";
import { updateTeleoperatorStatus } from "@/lib/repositories/teleoperators";
import { getUserClaims, requireRole } from "@/lib/utils/auth";
import type { TeleoperatorStatus } from "@/lib/types";

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Check permissions
    requireRole(claims, "partner_admin");

    const body = await request.json();
    const { status } = body;

    if (!status || !["available", "busy", "offline", "on-break"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await updateTeleoperatorStatus(params.id, status as TeleoperatorStatus);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PATCH /api/v1/teleoperators/[id]/status error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

