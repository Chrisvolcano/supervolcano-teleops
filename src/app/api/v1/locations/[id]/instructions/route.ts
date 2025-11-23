/**
 * API Route: Location Instructions
 * GET: List all instructions for a location
 * POST: Create a new instruction
 */

import { NextRequest, NextResponse } from "next/server";
import { getInstructions, createInstruction } from "@/lib/repositories/instructions";
import { getUserClaims, requireRole } from "@/lib/utils/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const locationId = params.id;
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Check permissions (user must be admin or have access to this location's partner)
    requireRole(claims, ["superadmin", "partner_admin"]);

    // Get all instructions for all tasks at this location
    // Since getInstructions requires taskId, we need to query all tasks first
    const adminDb = (await import("@/lib/firebaseAdmin")).adminDb;
    const tasksSnapshot = await adminDb
      .collection("locations")
      .doc(locationId)
      .collection("tasks")
      .get();
    
    const allInstructions: any[] = [];
    for (const taskDoc of tasksSnapshot.docs) {
      const taskInstructions = await getInstructions(locationId, taskDoc.id);
      allInstructions.push(...taskInstructions);
    }
    
    return NextResponse.json(allInstructions);
  } catch (error: any) {
    console.error("[api] GET /api/v1/locations/[id]/instructions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch instructions" },
      { status: error.statusCode || 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const locationId = params.id;
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Check permissions
    requireRole(claims, ["superadmin", "partner_admin"]);

    const body = await request.json();
    const { taskId, title, room, description, imageUrls, videoUrls, notes } = body;

    // Validation
    if (!taskId || !title || !description) {
      return NextResponse.json(
        { error: "Missing required fields: taskId, title, description" },
        { status: 400 },
      );
    }

    // Get uid from decoded token
    const adminAuth = (await import("@/lib/firebaseAdmin")).adminAuth;
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const instructionId = await createInstruction(
      locationId,
      taskId,
      {
        title,
        room,
        description,
        notes,
      },
      imageUrls || [],
      videoUrls || [],
      uid,
    );

    return NextResponse.json({ id: instructionId }, { status: 201 });
  } catch (error: any) {
    console.error("[api] POST /api/v1/locations/[id]/instructions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create instruction" },
      { status: error.statusCode || 500 },
    );
  }
}

