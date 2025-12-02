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
    console.log("[api] GET /api/v1/teleoperators - Starting request");
    
    // Get auth token from header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[api] GET /api/v1/teleoperators - No authorization header");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log("[api] GET /api/v1/teleoperators - Token received, length:", token.length);
    
    const claims = await getUserClaims(token);
    if (!claims) {
      console.error("[api] GET /api/v1/teleoperators - Invalid token");
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    console.log("[api] GET /api/v1/teleoperators - Claims:", { role: claims.role, partnerId: claims.partnerId });

    // Check permissions
    requireRole(claims, "partner_admin"); // partner_admin or superadmin can list

    // Get query params
    const { searchParams } = new URL(request.url);
    const partnerOrgId = searchParams.get("partnerOrgId") || undefined;
    const status = searchParams.get("status") as TeleoperatorStatus | null;

    // Filter by partner if not superadmin
    const finalPartnerId = claims.role === "superadmin" ? partnerOrgId : claims.partnerId;
    
    console.log("[api] GET /api/v1/teleoperators - Querying Firestore:", {
      collection: "teleoperators",
      partnerId: finalPartnerId,
      status: status || undefined,
    });

    const teleoperators = await listTeleoperators(finalPartnerId, status || undefined);

    console.log("[api] GET /api/v1/teleoperators - Success:", { count: teleoperators.length });
    return NextResponse.json({ teleoperators });
  } catch (error: any) {
    console.error("[api] GET /api/v1/teleoperators - Error:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[api] POST /api/v1/teleoperators - Starting request");
    
    // Get auth token from header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[api] POST /api/v1/teleoperators - No authorization header");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log("[api] POST /api/v1/teleoperators - Token received, length:", token.length);
    
    const claims = await getUserClaims(token);
    if (!claims) {
      console.error("[api] POST /api/v1/teleoperators - Invalid token");
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    console.log("[api] POST /api/v1/teleoperators - Claims:", { role: claims.role, partnerId: claims.partnerId });

    // Check permissions
    requireRole(claims, "partner_admin"); // partner_admin or superadmin can create

    const body = await request.json();
    const { email, displayName, photoUrl, partnerOrgId, organizationId, organizationName, phone, currentStatus, certifications, robotTypesQualified, role } =
      body;

    console.log("[api] POST /api/v1/teleoperators - Request body:", {
      email,
      displayName,
      partnerOrgId,
      hasPhone: !!phone,
      currentStatus,
    });

    // Validate required fields
    if (!email || !displayName || !partnerOrgId || !organizationId) {
      console.error("[api] POST /api/v1/teleoperators - Missing required fields");
      return NextResponse.json({ error: "Missing required fields (email, displayName, partnerOrgId, organizationId)" }, { status: 400 });
    }

    // If not superadmin, can only create for their own partner
    if (claims.role !== "superadmin" && partnerOrgId !== claims.partnerId) {
      console.error("[api] POST /api/v1/teleoperators - Permission denied: cannot create for other partners");
      return NextResponse.json({ error: "Cannot create teleoperator for other partners" }, { status: 403 });
    }

    // Get user UID from token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const createdBy = decodedToken.uid;
    
    console.log("[api] POST /api/v1/teleoperators - Creating teleoperator in Firestore:", {
      collection: "teleoperators",
      email,
      partnerOrgId,
      createdBy,
    });

    const { teleoperatorId, uid, password } = await createTeleoperator(
      {
        email,
        displayName,
        photoUrl,
        partnerOrgId,
        organizationId,
        organizationName,
        phone,
        currentStatus: currentStatus || "offline",
        certifications: certifications || [],
        robotTypesQualified: robotTypesQualified || [],
        role: role || "oem_teleoperator", // Default to teleoperator if not specified
      },
      createdBy,
    );

    console.log("[api] POST /api/v1/teleoperators - Success:", { teleoperatorId, uid });
    return NextResponse.json({ teleoperatorId, uid, password }, { status: 201 });
  } catch (error: any) {
    console.error("[api] POST /api/v1/teleoperators - Error:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
      errorType: error.constructor.name,
    });
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

