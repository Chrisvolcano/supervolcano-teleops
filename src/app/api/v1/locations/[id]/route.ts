/**
 * API Route: Location by ID
 * GET: Get single location
 * PATCH: Update location
 * DELETE: Delete location (soft delete - marks as inactive)
 */

import { NextRequest, NextResponse } from "next/server";
import { getLocation, updateLocation, deleteLocation } from "@/lib/repositories/locations";
import { getUserClaims, requireRole } from "@/lib/utils/auth";
import type { LocationStatus, LocationType } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    console.log("[api] GET /api/v1/locations/[id] - Starting request");

    // Get auth token from header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[api] GET /api/v1/locations/[id] - No authorization header");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const claims = await getUserClaims(token);
    if (!claims) {
      console.error("[api] GET /api/v1/locations/[id] - Invalid token");
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Check permissions
    requireRole(claims, ["partner_admin", "org_manager", "oem_teleoperator"]);

    const locationId = params.id;
    const location = await getLocation(locationId);
    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // If org_manager or teleoperator, verify they have access to this location's organization
    if (claims.role === "org_manager" || claims.role === "oem_teleoperator") {
      if (location.assignedOrganizationId !== claims.organizationId) {
        return NextResponse.json({ error: "Cannot view location for other organizations" }, { status: 403 });
      }
    } else if (claims.role !== "superadmin" && location.partnerOrgId !== claims.partnerId) {
      // If not superadmin, can only view their own partner's locations
      return NextResponse.json({ error: "Cannot view location for other partners" }, { status: 403 });
    }

    console.log("[api] GET /api/v1/locations/[id] - Success");
    return NextResponse.json(location);
  } catch (error: any) {
    console.error("[api] GET /api/v1/locations/[id] - Error:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    console.log("[api] PATCH /api/v1/locations/[id] - Starting request");

    // Get auth token from header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[api] PATCH /api/v1/locations/[id] - No authorization header");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const claims = await getUserClaims(token);
    if (!claims) {
      console.error("[api] PATCH /api/v1/locations/[id] - Invalid token");
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    console.log("[api] PATCH /api/v1/locations/[id] - Claims:", { role: claims.role, partnerId: claims.partnerId });

    // Check permissions
    requireRole(claims, "partner_admin");

    const locationId = params.id;
    const location = await getLocation(locationId);
    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // If not superadmin, can only update their own partner's locations
    if (claims.role !== "superadmin" && location.partnerOrgId !== claims.partnerId) {
      return NextResponse.json({ error: "Cannot update location for other partners" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      address,
      type,
      primaryContact,
      accessInstructions,
      entryCode,
      parkingInfo,
      status,
      assignedTeleoperatorIds,
      assignedOrganizationId,
      assignedOrganizationName,
      coordinates,
    } = body;

    console.log("[api] PATCH /api/v1/locations/[id] - Updating location:", {
      locationId,
      updates: Object.keys(body),
    });

    // Update location
    // Handle null values explicitly for unassignment
    const updatePayload: any = {
      name,
      address,
      type: type as LocationType | undefined,
      primaryContact,
      accessInstructions,
      entryCode,
      parkingInfo,
      status: status as LocationStatus | undefined,
      assignedTeleoperatorIds: assignedTeleoperatorIds || undefined,
      coordinates,
    };

    // Explicitly handle organization assignment/unassignment
    if (assignedOrganizationId === null) {
      updatePayload.assignedOrganizationId = null;
      updatePayload.assignedOrganizationName = null;
    } else if (assignedOrganizationId !== undefined) {
      updatePayload.assignedOrganizationId = assignedOrganizationId;
      updatePayload.assignedOrganizationName = assignedOrganizationName || undefined;
    }

    await updateLocation(locationId, updatePayload);

    console.log("[api] PATCH /api/v1/locations/[id] - Success");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[api] PATCH /api/v1/locations/[id] - Error:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    console.log("[api] DELETE /api/v1/locations/[id] - Starting request");

    // Get auth token from header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[api] DELETE /api/v1/locations/[id] - No authorization header");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const claims = await getUserClaims(token);
    if (!claims) {
      console.error("[api] DELETE /api/v1/locations/[id] - Invalid token");
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Check permissions
    requireRole(claims, "partner_admin");

    const locationId = params.id;
    const location = await getLocation(locationId);
    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // If not superadmin, can only delete their own partner's locations
    if (claims.role !== "superadmin" && location.partnerOrgId !== claims.partnerId) {
      return NextResponse.json({ error: "Cannot delete location for other partners" }, { status: 403 });
    }

    console.log("[api] DELETE /api/v1/locations/[id] - Deleting location:", locationId);

    // Soft delete (mark as inactive)
    await deleteLocation(locationId);

    console.log("[api] DELETE /api/v1/locations/[id] - Success");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[api] DELETE /api/v1/locations/[id] - Error:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

