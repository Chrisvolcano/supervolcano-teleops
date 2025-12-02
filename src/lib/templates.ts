import { doc, increment, updateDoc } from "firebase/firestore";

import { firestore } from "@/lib/firebaseClient";
import type { TaskAssignment } from "@/components/TaskForm";

function getAssignmentField(prefix: "assigned" | "completed", assignment: TaskAssignment) {
  return assignment === "oem_teleoperator"
    ? `stats.${prefix}Teleop`
    : `stats.${prefix}Human`;
}

export async function incrementTemplateAssignment(
  templateId: string | undefined,
  assignment: TaskAssignment,
) {
  if (!templateId) return;
  const templateRef = doc(firestore, "taskTemplates", templateId);
  await updateDoc(templateRef, {
    [getAssignmentField("assigned", assignment)]: increment(1),
  });
}

export async function incrementTemplateCompletion(
  templateId: string | undefined,
  assignment: TaskAssignment,
) {
  if (!templateId) return;
  const templateRef = doc(firestore, "taskTemplates", templateId);
  await updateDoc(templateRef, {
    [getAssignmentField("completed", assignment)]: increment(1),
  });
}
