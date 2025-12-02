/**
 * API Route: Task Completions
 * GET: List task completions (with optional filters)
 * POST: Create a new task completion
 */

import { NextRequest, NextResponse } from "next/server";
import { recordTaskCompletion, getSessionTaskCompletions } from "@/lib/repositories/taskCompletions";
import { getOrCreateSessionForDate, addCompletionToSession } from "@/lib/repositories/sessions";
import { getUserClaims, requireRole } from "@/lib/utils/auth";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    requireRole(claims, ["superadmin", "partner_admin", "org_manager", "oem_teleoperator"]);

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    const sessionId = searchParams.get("sessionId");
    const organizationId = searchParams.get("organizationId");
    const teleoperatorId = searchParams.get("teleoperatorId");
    const bySession = searchParams.get("bySession"); // If true, return completions grouped by taskId

    let query: FirebaseFirestore.Query = adminDb.collection("taskCompletions");

    if (taskId) {
      query = query.where("taskId", "==", taskId);
    }

    if (sessionId) {
      query = query.where("sessionId", "==", sessionId);
    }

    if (organizationId) {
      query = query.where("organizationId", "==", organizationId);
    } else if (claims.organizationId) {
      // Filter by user's organization if not specified
      query = query.where("organizationId", "==", claims.organizationId);
    }

    if (teleoperatorId) {
      query = query.where("teleoperatorId", "==", teleoperatorId);
    } else if (claims.role === "oem_teleoperator" && claims.teleoperatorId) {
      // Filter by current teleoperator if not specified
      query = query.where("teleoperatorId", "==", claims.teleoperatorId);
    }

    // If bySession=true and sessionId is provided, return grouped by taskId
    if (bySession === "true" && sessionId) {
      const result = await getSessionTaskCompletions(sessionId);
      if (result.success) {
        return NextResponse.json({ completions: result.completions });
      } else {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
    }

    query = query.orderBy("completedAt", "desc").limit(100);

    const snapshot = await query.get();
    const completions = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        completedAt: data.completedAt,
        startedAt: data.startedAt,
      };
    });

    return NextResponse.json({ completions });
  } catch (error: any) {
    console.error("Error fetching task completions:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const claims = await getUserClaims(token);

    if (!claims) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Only teleoperators can create completions
    if (claims.role !== "oem_teleoperator") {
      return NextResponse.json({ error: "Only teleoperators can mark tasks complete" }, { status: 403 });
    }

    const data = await request.json();

    // Validate data
    if (
      !data.taskId ||
      !data.actualDuration ||
      data.actualDuration <= 0 ||
      !data.locationId ||
      !data.organizationId ||
      !data.teleoperatorId
    ) {
      return NextResponse.json({ error: "Invalid completion data: missing required fields" }, { status: 400 });
    }

    // Ensure organizationId and teleoperatorId match the user's claims
    if (data.organizationId !== claims.organizationId || data.teleoperatorId !== claims.teleoperatorId) {
      return NextResponse.json(
        { error: "Cannot create completion for a different organization or teleoperator" },
        { status: 403 },
      );
    }

    // Get date for session (from completion time)
    const completionDate = new Date(data.completedAt || new Date());
    const dateString = completionDate.toISOString().split("T")[0]; // YYYY-MM-DD

    // Get or create session for this location + date
    // Use organizationName and teleoperatorName from request data, or fallback to empty strings
    const sessionResult = await getOrCreateSessionForDate(
      data.organizationId,
      data.organizationName || "",
      data.teleoperatorId,
      data.teleoperatorName || "",
      data.locationId,
      data.locationName || "",
      dateString
    );

    if (!sessionResult.success || !sessionResult.session) {
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    const session = sessionResult.session;
    const isNewSession = sessionResult.created;

    if (!session || !session.id) {
      return NextResponse.json({ error: "Session ID is missing" }, { status: 500 });
    }

    const sessionId = session.id;
    const sessionTotalTasks = (session as any).totalTasks || 0;

    // Add sessionId to completion data
    const completionDataWithSession = {
      ...data,
      sessionId: sessionId,
    };

    // Record completion
    const result = await recordTaskCompletion(completionDataWithSession);

    if (!result.success || !result.id) {
      return NextResponse.json({ error: result.error || "Failed to record completion" }, { status: 500 });
    }

    const completionId = result.id;

    // Update session with this completion
    await addCompletionToSession(
      sessionId,
      completionId,
      data.actualDuration,
      new Date(data.startedAt),
      new Date(data.completedAt)
    );

    return NextResponse.json({
      success: true,
      id: completionId,
      sessionId: sessionId,
      isNewSession,
      sessionTotalTasks: sessionTotalTasks + 1,
    });
  } catch (error: any) {
    console.error("Error recording task completion:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
