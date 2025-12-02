/**
 * API Route: Session by ID
 * GET: Get single session
 * PATCH: Update session (end session)
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserClaims, requireRole } from "@/lib/utils/auth";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const sessionId = params.id;
    const sessionDoc = await adminDb.collection("sessions").doc(sessionId).get();

    if (!sessionDoc.exists) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const sessionData = sessionDoc.data();

    // Check access permissions
    if (claims.role === "oem_teleoperator") {
      if (sessionData?.teleoperatorId !== claims.teleoperatorId) {
        return NextResponse.json({ error: "Cannot view other teleoperators' sessions" }, { status: 403 });
      }
    } else if (claims.role === "org_manager") {
      if (sessionData?.organizationId !== claims.organizationId) {
        return NextResponse.json({ error: "Cannot view sessions from other organizations" }, { status: 403 });
      }
    }

    return NextResponse.json({ session: { id: sessionDoc.id, ...sessionData } });
  } catch (error: any) {
    console.error("Error fetching session:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Only teleoperators can update their own sessions
    if (claims.role !== "oem_teleoperator") {
      return NextResponse.json({ error: "Only teleoperators can update sessions" }, { status: 403 });
    }

    const sessionId = params.id;
    const body = await request.json();
    const { action, endedAt, completionId, taskDuration } = body;

    // Get session to verify ownership
    const sessionDoc = await adminDb.collection("sessions").doc(sessionId).get();
    if (!sessionDoc.exists) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const sessionData = sessionDoc.data();
    if (sessionData?.teleoperatorId !== claims.teleoperatorId) {
      return NextResponse.json({ error: "Cannot update other teleoperators' sessions" }, { status: 403 });
    }

    // Sessions are now automatically managed - no manual end action needed
    // This endpoint is kept for backward compatibility but sessions auto-update on task completion
    return NextResponse.json({ 
      error: "Sessions are automatically managed. No manual updates needed.",
      note: "Sessions are created and updated automatically when tasks are completed."
    }, { status: 400 });
  } catch (error: any) {
    console.error("Error updating session:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

