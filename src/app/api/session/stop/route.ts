import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { requireAdmin } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { TaskState, TASK_TERMINAL_STATES } from "@/lib/taskMachine";

type StopSessionPayload = {
  sessionId?: string;
  result_state?: TaskState;
};

export async function POST(request: NextRequest) {
  const authorized = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: StopSessionPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const { sessionId, result_state } = payload;

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId is required." },
      { status: 400 },
    );
  }

  const sessionRef = adminDb.collection("sessions").doc(sessionId);
  const snapshot = await sessionRef.get();

  if (!snapshot.exists) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const sessionData = snapshot.data() as {
    locationId?: string;
    taskId?: string | null;
    operatorId?: string;
  };

  const now = new Date().toISOString();

  try {
    await sessionRef.set(
      {
        status: "ended",
        endedAt: now,
        updatedAt: now,
      },
      { merge: true },
    );

    if (sessionData.locationId) {
      await adminDb
        .collection("locations")
        .doc(sessionData.locationId)
        .set(
          {
            activeSessionId: null,
            updatedAt: now,
          },
          { merge: true },
        );
    }

    if (
      sessionData.taskId &&
      result_state &&
      TASK_TERMINAL_STATES.includes(result_state)
    ) {
      await adminDb
        .collection("tasks")
        .doc(sessionData.taskId)
        .set(
          {
            state: result_state,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
    }

    await adminDb.collection("auditLogs").doc().set({
      entityId: sessionId,
      entityType: "session",
      action: "session_stopped",
      actorId: sessionData.operatorId ?? "system",
      createdAt: now,
      details: {
        result_state: result_state ?? null,
      },
    });

    return NextResponse.json({ success: true, endedAt: now });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to stop session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

