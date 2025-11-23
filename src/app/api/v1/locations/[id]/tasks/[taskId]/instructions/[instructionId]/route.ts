/**
 * API Route: Single Instruction
 * GET: Get instruction by ID
 * PATCH: Update instruction
 * DELETE: Delete instruction
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getInstruction,
  updateInstruction,
  deleteInstruction,
} from "@/lib/repositories/instructions";
import { getUserClaims, requireRole } from "@/lib/utils/auth";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string; instructionId: string } },
) {
  try {
    const { id: locationId, taskId, instructionId } = params;
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    requireRole(claims, ["superadmin", "partner_admin"]);

    const instruction = await getInstruction(locationId, taskId, instructionId);
    if (!instruction) {
      return NextResponse.json({ error: "Instruction not found" }, { status: 404 });
    }

    return NextResponse.json(instruction);
  } catch (error: any) {
    console.error("[api] GET /api/v1/locations/[id]/tasks/[taskId]/instructions/[instructionId]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch instruction" },
      { status: error.statusCode || 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string; instructionId: string } },
) {
  try {
    const { id: locationId, taskId, instructionId } = params;
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

    await updateInstruction(
      locationId,
      taskId,
      instructionId,
      {
        title,
        description,
        room,
        stepNumber,
        notes,
      },
      imageUrls,
      videoUrls,
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[api] PATCH /api/v1/locations/[id]/tasks/[taskId]/instructions/[instructionId]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update instruction" },
      { status: error.statusCode || 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string; instructionId: string } },
) {
  try {
    const { id: locationId, taskId, instructionId } = params;
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    requireRole(claims, ["superadmin", "partner_admin"]);

    await deleteInstruction(locationId, taskId, instructionId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[api] DELETE /api/v1/locations/[id]/tasks/[taskId]/instructions/[instructionId]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete instruction" },
      { status: error.statusCode || 500 },
    );
  }
}

