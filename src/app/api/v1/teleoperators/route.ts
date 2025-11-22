/**
 * API Route: Teleoperators
 * GET: List teleoperators
 * POST: Create teleoperator
 */

import { NextRequest, NextResponse } from "next/server";
import { createTeleoperator, listTeleoperators } from "@/lib/repositories/teleoperators";
import { getUserClaims, requireRole } from "@/lib/utils/auth";
import { adminAuth } from "@/lib/firebaseAdmin";
import type { TeleoperatorStatus } from "@/lib/types";

export async function GET(request: NextRequest) {
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
    requireRole(claims, "partner_admin"); // partner_admin or superadmin can list

    // Get query params
    const { searchParams } = new URL(request.url);
    const partnerOrgId = searchParams.get("partnerOrgId") || undefined;
    const status = searchParams.get("status") as TeleoperatorStatus | null;

    // Filter by partner if not superadmin
    const finalPartnerId = claims.role === "superadmin" ? partnerOrgId : claims.partnerId;

    const teleoperators = await listTeleoperators(finalPartnerId, status || undefined);

    return NextResponse.json({ teleoperators });
  } catch (error: any) {
    console.error("GET /api/v1/teleoperators error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    requireRole(claims, "partner_admin"); // partner_admin or superadmin can create

    const body = await request.json();
    const { email, displayName, photoUrl, partnerOrgId, phone, currentStatus, certifications, robotTypesQualified } =
      body;

    // Validate required fields
    if (!email || !displayName || !partnerOrgId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // If not superadmin, can only create for their own partner
    if (claims.role !== "superadmin" && partnerOrgId !== claims.partnerId) {
      return NextResponse.json({ error: "Cannot create teleoperator for other partners" }, { status: 403 });
    }

    // Get user UID from token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const createdBy = decodedToken.uid;

    const { teleoperatorId, uid } = await createTeleoperator(
      {
        email,
        displayName,
        photoUrl,
        partnerOrgId,
        phone,
        currentStatus: currentStatus || "offline",
        certifications: certifications || [],
        robotTypesQualified: robotTypesQualified || [],
      },
      createdBy,
    );

    return NextResponse.json({ teleoperatorId, uid }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/v1/teleoperators error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

