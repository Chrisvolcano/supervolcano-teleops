/**
 * API Route: Location Tasks
 * GET: List all tasks for a location
 * POST: Create a new task
 */

import { NextRequest, NextResponse } from "next/server";
import { getTasks, createTask } from "@/lib/repositories/tasks";
import { getUserClaims, requireRole } from "@/lib/utils/auth";
import { adminAuth } from "@/lib/firebaseAdmin";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const locationId = params.id;
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    const status = request.nextUrl.searchParams.get("status") as "active" | "draft" | "archived" | null;

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

    console.log("[api] GET /api/v1/locations/[id]/tasks - Fetching tasks", {
      locationId,
      status: status || "all",
    });

    const tasks = await getTasks(locationId, status || undefined);
    
    console.log("[api] GET /api/v1/locations/[id]/tasks - Success, returning", tasks.length, "tasks");
    
    return NextResponse.json({ tasks });
  } catch (error: any) {
    console.error("[api] GET /api/v1/locations/[id]/tasks - Error:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
      locationId: params.id,
    });
    return NextResponse.json(
      { 
        error: error.message || "Failed to fetch tasks",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
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

    requireRole(claims, ["superadmin", "partner_admin"]);

    const body = await request.json();
    const {
      title,
      description,
      category,
      priority,
      estimatedDuration,
      assignmentType,
      assignedTeleoperatorId,
      assignedTeleoperatorName,
      assignedHumanName,
      status,
      instructions,
    } = body;

    // Validation
    if (!title || !description || !category || !priority || !estimatedDuration || !assignmentType || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!["cleaning", "maintenance", "inspection", "delivery", "security"].includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 },
      );
    }

    if (!["oem_teleoperator", "human", "unassigned"].includes(assignmentType)) {
      return NextResponse.json(
        { error: "Invalid assignment type" },
        { status: 400 },
      );
    }

    console.log("[api] POST /api/v1/locations/[id]/tasks - Creating task:", {
      locationId,
      title,
      category,
      assignmentType,
      status,
      instructionCount: instructions?.length || 0,
    });

    const taskId = await createTask(
      locationId,
      {
        title,
        description,
        category,
        priority,
        estimatedDuration,
        assignmentType,
        assignedTeleoperatorId,
        assignedTeleoperatorName,
        assignedHumanName,
        status,
      },
      (await adminAuth.verifyIdToken(token)).uid,
      instructions || [],
    );

    console.log("[api] POST /api/v1/locations/[id]/tasks - Task created successfully:", taskId);

    return NextResponse.json({ id: taskId }, { status: 201 });
  } catch (error: any) {
    console.error("[api] POST /api/v1/locations/[id]/tasks - Error:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: error.message || "Failed to create task" },
      { status: error.statusCode || 500 },
    );
  }
}

