/**
 * API Route: Task Instructions
 * GET: List all instructions for a task
 * POST: Create a new instruction
 */

import { NextRequest, NextResponse } from "next/server";
import { getInstructions, createInstruction } from "@/lib/repositories/instructions";
import { getUserClaims, requireRole } from "@/lib/utils/auth";
import { adminAuth } from "@/lib/firebaseAdmin";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string } },
) {
  try {
    const { id: locationId, taskId } = params;
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

    // For org_manager and teleoperator, verify they have access to this location's organization
    if (claims.role === "org_manager" || claims.role === "oem_teleoperator") {
      const { getLocation } = await import("@/lib/repositories/locations");
      const location = await getLocation(locationId);
      if (!location) {
        return NextResponse.json({ error: "Location not found" }, { status: 404 });
      }
      if (location.assignedOrganizationId !== claims.organizationId) {
        return NextResponse.json({ error: "Access denied to this location" }, { status: 403 });
      }
    }

    const instructions = await getInstructions(locationId, taskId);
    return NextResponse.json({ instructions });
  } catch (error: any) {
    console.error("[api] GET /api/v1/locations/[id]/tasks/[taskId]/instructions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch instructions" },
      { status: error.statusCode || 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string } },
) {
  try {
    const { id: locationId, taskId } = params;
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
    const { title, description, room, stepNumber, notes, imageUrls, videoUrls } = body;

    // Validation
    if (!title || !description) {
      return NextResponse.json(
        { error: "Missing required fields: title, description" },
        { status: 400 },
      );
    }

    // Get uid from decoded token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const instructionId = await createInstruction(
      locationId,
      taskId,
      {
        title,
        description,
        room,
        stepNumber,
        notes,
      },
      imageUrls || [],
      videoUrls || [],
      uid,
    );

    return NextResponse.json({ id: instructionId }, { status: 201 });
  } catch (error: any) {
    console.error("[api] POST /api/v1/locations/[id]/tasks/[taskId]/instructions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create instruction" },
      { status: error.statusCode || 500 },
    );
  }
}

