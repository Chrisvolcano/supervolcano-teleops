import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { requireAdmin } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";

type StartSessionPayload = {
  operatorId?: string;
  partnerOrgId?: string;
  locationId?: string;
  taskId?: string | null;
  allowed_hours?: number;
};

export async function POST(request: NextRequest) {
  const authorized = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: StartSessionPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const { operatorId, partnerOrgId, locationId, taskId, allowed_hours } =
    payload;

  if (!operatorId || !partnerOrgId || !locationId || !allowed_hours) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: operatorId, partnerOrgId, locationId, allowed_hours.",
      },
      { status: 400 },
    );
  }

  if (allowed_hours <= 0 || allowed_hours > 24) {
    return NextResponse.json(
      { error: "allowed_hours must be between 0 and 24." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const sessionRef = adminDb.collection("sessions").doc();

  const sessionData = {
    id: sessionRef.id,
    operatorId,
    partnerOrgId,
    locationId,
    taskId: taskId ?? null,
    allowedHours: allowed_hours,
    status: "active",
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await sessionRef.set(sessionData);
    await adminDb
      .collection("locations")
      .doc(locationId)
      .set(
        {
          activeSessionId: sessionRef.id,
          updatedAt: now,
        },
        { merge: true },
      );

    await adminDb.collection("auditLogs").doc().set({
      entityId: sessionRef.id,
      entityType: "session",
      action: "session_started",
      actorId: operatorId,
      createdAt: now,
      details: { locationId, taskId, allowed_hours },
    });

    if (taskId) {
      await adminDb
        .collection("tasks")
        .doc(taskId)
        .set(
          {
            state: "in_progress",
            assigneeId: operatorId,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        )
        .catch(() => undefined);
    }

    return NextResponse.json({ success: true, session: sessionData });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

