import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";

function toDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
  const authorized = await requireAdmin(request);
  if (!authorized) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");

  const fromDate = toDate(fromParam);
  const toDateLimit = toDate(toParam);
  const snapshot = await adminDb.collection("sessions").get();

  const rows: string[] = [];
  rows.push(
    [
      "date",
      "locationId",
      "taskId",
      "outcome",
      "qcRating",
      "robotSeconds",
      "humanSeconds",
      "teleopUserId",
      "humanUserId",
      "notes",
    ].join(","),
  );

  snapshot.forEach((doc) => {
    const data = doc.data();
    const startedValue = data.started_at ?? data.startedAt;
    const startedAt = startedValue ? new Date(startedValue) : null;
    if (fromDate && startedAt && startedAt < fromDate) return;
    if (toDateLimit && startedAt && startedAt > toDateLimit) return;
    rows.push(
      [
        data.started_at ?? "",
        data.locationId ?? data.propertyId ?? "",
        data.taskId ?? "",
        data.outcome ?? "",
        data.qc?.rating ?? 0,
        data.metrics?.robotActiveSec ?? 0,
        data.metrics?.humanActiveSec ?? 0,
        data.teleop_user_id ?? "",
        data.human_user_id ?? "",
        JSON.stringify(data.qc?.notes ?? ""),
      ].join(","),
    );
  });

  const csv = rows.join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=supervolcano-sessions.csv",
    },
  });
}
