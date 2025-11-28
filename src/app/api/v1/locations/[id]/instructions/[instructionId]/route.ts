/**
 * API Route: Single Instruction
 * GET: Get instruction by ID
 * PATCH: Update instruction
 * DELETE: Delete instruction
 */

import { NextRequest, NextResponse } from "next/server";
import {
  updateInstruction,
  deleteInstruction,
} from "@/lib/repositories/instructions";
import { getUserClaims, requireRole } from "@/lib/utils/auth";
import { adminDb } from "@/lib/firebaseAdmin";

// Helper to find taskId for an instruction
async function findTaskIdForInstruction(locationId: string, instructionId: string): Promise<string | null> {
  const tasksSnapshot = await adminDb
    .collection("locations")
    .doc(locationId)
    .collection("tasks")
    .get();
  
  for (const taskDoc of tasksSnapshot.docs) {
    const instructionDoc = await adminDb
      .collection("locations")
      .doc(locationId)
      .collection("tasks")
      .doc(taskDoc.id)
      .collection("instructions")
      .doc(instructionId)
      .get();
    
    if (instructionDoc.exists) {
      return taskDoc.id;
    }
  }
  
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; instructionId: string } },
) {
  try {
    const { id: locationId, instructionId } = params;
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    requireRole(claims, ["superadmin", "partner_admin"]);

    // Find taskId for this instruction
    const taskId = await findTaskIdForInstruction(locationId, instructionId);
    if (!taskId) {
      return NextResponse.json({ error: "Instruction not found" }, { status: 404 });
    }

    // Get instruction using taskId
    const instructionDoc = await adminDb
      .collection("locations")
      .doc(locationId)
      .collection("tasks")
      .doc(taskId)
      .collection("instructions")
      .doc(instructionId)
      .get();
    
    if (!instructionDoc.exists) {
      return NextResponse.json({ error: "Instruction not found" }, { status: 404 });
    }

    const instruction = { id: instructionDoc.id, ...instructionDoc.data() };
    return NextResponse.json(instruction);
  } catch (error: any) {
    console.error("[api] GET /api/v1/locations/[id]/instructions/[instructionId]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch instruction" },
      { status: error.statusCode || 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; instructionId: string } },
) {
  try {
    const { id: locationId, instructionId } = params;
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    requireRole(claims, ["superadmin", "partner_admin"]);

    // Find taskId for this instruction
    const taskId = await findTaskIdForInstruction(locationId, instructionId);
    if (!taskId) {
      return NextResponse.json({ error: "Instruction not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, room, category, description, imageUrls, videoUrls, priority } = body;

    // Validate category if provided
    if (category && !["cleaning", "organization", "maintenance", "security"].includes(category)) {
      return NextResponse.json(
        { error: "Invalid category. Must be: cleaning, organization, maintenance, or security" },
        { status: 400 },
      );
    }

    await updateInstruction(
      locationId,
      taskId,
      instructionId,
      {
        title,
        room,
        description,
      },
      imageUrls,
      videoUrls
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[api] PATCH /api/v1/locations/[id]/instructions/[instructionId]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update instruction" },
      { status: error.statusCode || 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; instructionId: string } },
) {
  try {
    const { id: locationId, instructionId } = params;
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    requireRole(claims, ["superadmin", "partner_admin"]);

    // Find taskId for this instruction
    const taskId = await findTaskIdForInstruction(locationId, instructionId);
    if (!taskId) {
      return NextResponse.json({ error: "Instruction not found" }, { status: 404 });
    }

    await deleteInstruction(locationId, taskId, instructionId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[api] DELETE /api/v1/locations/[id]/instructions/[instructionId]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete instruction" },
      { status: error.statusCode || 500 },
    );
  }
}

