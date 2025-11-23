/**
 * API Route: Organizations
 * GET: List all organizations
 * POST: Create a new organization
 */

import { NextRequest, NextResponse } from "next/server";
import { getOrganizations, createOrganization } from "@/lib/repositories/organizations";
import { createTeleoperator } from "@/lib/repositories/teleoperators";
import { getUserClaims, requireRole } from "@/lib/utils/auth";
import { adminAuth } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
  try {
    console.log("[api] GET /api/v1/organizations - Starting request");
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      console.error("[api] GET /api/v1/organizations - No token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = await getUserClaims(token);
    if (!claims) {
      console.error("[api] GET /api/v1/organizations - Invalid token");
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    console.log("[api] GET /api/v1/organizations - Claims:", { role: claims.role, partnerId: claims.partnerId });

    requireRole(claims, ["superadmin", "partner_admin"]);

    // Filter by partner if not superadmin
    const partnerId = claims.role === "superadmin" ? undefined : claims.partnerId;
    console.log("[api] GET /api/v1/organizations - Filtering by partnerId:", partnerId);

    const organizations = await getOrganizations(partnerId);
    console.log("[api] GET /api/v1/organizations - Success:", { count: organizations.length });

    return NextResponse.json({ organizations });
  } catch (error: any) {
    console.error("[api] GET /api/v1/organizations - Error:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      { error: error.message || "Failed to fetch organizations" },
      { status: error.statusCode || 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    requireRole(claims, ["superadmin", "partner_admin"]);

    const body = await request.json();
    const { name, contactName, contactEmail, contactPhone, status, managerEmail, managerDisplayName } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }

    if (!managerEmail || !managerDisplayName) {
      return NextResponse.json({ error: "Manager email and name are required" }, { status: 400 });
    }

    const partnerId = claims.role === "superadmin" ? body.partnerId || claims.partnerId : claims.partnerId;

    // Step 1: Create organization
    const organizationId = await createOrganization(
      {
        name: name.trim(),
        contactName: contactName?.trim(),
        contactEmail: contactEmail?.trim(),
        contactPhone: contactPhone?.trim(),
        status: status || "active",
        partnerId: partnerId || "",
      },
      (await adminAuth.verifyIdToken(token)).uid,
    );

    // Step 2: Create primary manager
    let managerPassword: string | undefined;
    try {
      const managerResult = await createTeleoperator(
        {
          email: managerEmail.trim(),
          displayName: managerDisplayName.trim(),
          role: "org_manager",
          partnerOrgId: partnerId || "",
          organizationId: organizationId,
          organizationName: name.trim(),
          currentStatus: "offline",
          certifications: [],
          robotTypesQualified: [],
        },
        (await adminAuth.verifyIdToken(token)).uid,
      );
      managerPassword = managerResult.password;
    } catch (error: any) {
      console.error("[api] POST /api/v1/organizations - Failed to create manager:", error);
      // Organization was created but manager failed - return error but keep org
      return NextResponse.json(
        { 
          error: "Organization created, but failed to create manager. Please add manager manually from organization page.",
          id: organizationId 
        },
        { status: 201 } // Still return 201 since org was created
      );
    }

    return NextResponse.json({ id: organizationId, password: managerPassword }, { status: 201 });
  } catch (error: any) {
    console.error("[api] POST /api/v1/organizations - Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create organization" },
      { status: error.statusCode || 500 },
    );
  }
}

