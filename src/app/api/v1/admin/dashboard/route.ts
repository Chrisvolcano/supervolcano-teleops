/**
 * API Route: Admin Dashboard Data
 * GET: Get comprehensive dashboard data for admin users
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDashboardData } from "@/lib/repositories/adminAnalytics";
import { getUserClaims, requireRole } from "@/lib/utils/auth";

export const dynamic = 'force-dynamic';

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

    // Only allow superadmin, admin, and partner_admin
    requireRole(claims, ["superadmin", "admin", "partner_admin"]);

    const result = await getAdminDashboardData();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to load dashboard data" },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error: any) {
    console.error("[admin/dashboard] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

