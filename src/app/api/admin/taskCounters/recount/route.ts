import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(request: NextRequest) {
  const authorized = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templateId = request.nextUrl.searchParams.get("templateId");

  const tasksRef = templateId
    ? adminDb.collection("tasks").where("templateId", "==", templateId)
    : adminDb.collection("tasks");

  const tasksSnapshot = await tasksRef.get();

  const accumulator = new Map<
    string,
    {
      assignedTeleop: number;
      completedTeleop: number;
      assignedHuman: number;
      completedHuman: number;
    }
  >();

  tasksSnapshot.forEach((doc) => {
    const data = doc.data();
    const currentTemplateId = data.templateId as string | undefined;
    if (!currentTemplateId) return;

    const entry = accumulator.get(currentTemplateId) ?? {
      assignedTeleop: 0,
      completedTeleop: 0,
      assignedHuman: 0,
      completedHuman: 0,
    };

    if (data.assigned_to === "oem_teleoperator") {
      entry.assignedTeleop += 1;
      if (data.status === "completed") {
        entry.completedTeleop += 1;
      }
    } else {
      entry.assignedHuman += 1;
      if (data.status === "completed") {
        entry.completedHuman += 1;
      }
    }

    accumulator.set(currentTemplateId, entry);
  });

  const batch = adminDb.batch();

  if (templateId) {
    const stats = accumulator.get(templateId) ?? {
      assignedTeleop: 0,
      completedTeleop: 0,
      assignedHuman: 0,
      completedHuman: 0,
    };
    batch.update(adminDb.collection("taskTemplates").doc(templateId), {
      stats,
    });
  } else {
    const templatesSnapshot = await adminDb.collection("taskTemplates").get();
    templatesSnapshot.forEach((templateDoc) => {
      const stats = accumulator.get(templateDoc.id) ?? {
        assignedTeleop: 0,
        completedTeleop: 0,
        assignedHuman: 0,
        completedHuman: 0,
      };
      batch.update(templateDoc.ref, { stats });
    });
  }

  await batch.commit();

  return NextResponse.json({ success: true }, { status: 200 });
}
