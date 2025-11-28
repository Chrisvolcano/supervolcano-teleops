/**
 * API Route: Single Task
 * GET: Get task by ID
 * PATCH: Update task
 * DELETE: Delete task
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getTask,
  updateTask,
  deleteTask,
} from "@/lib/repositories/tasks";
import { getUserClaims, requireRole } from "@/lib/utils/auth";

export const dynamic = 'force-dynamic';

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

    requireRole(claims, ["superadmin", "partner_admin"]);

    const task = await getTask(locationId, taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error: any) {
    console.error("[api] GET /api/v1/locations/[id]/tasks/[taskId]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch task" },
      { status: error.statusCode || 500 },
    );
  }
}

export async function PATCH(
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
    const { instructions, ...taskUpdates } = body;
    
    await updateTask(locationId, taskId, taskUpdates, instructions);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[api] PATCH /api/v1/locations/[id]/tasks/[taskId]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update task" },
      { status: error.statusCode || 500 },
    );
  }
}

export async function DELETE(
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

    await deleteTask(locationId, taskId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[api] DELETE /api/v1/locations/[id]/tasks/[taskId]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete task" },
      { status: error.statusCode || 500 },
    );
  }
}

