import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type FirestoreError,
} from "firebase/firestore";

import { db } from "@/lib/firebaseClient";
import { toTimestampLike } from "@/lib/format";
import type { SVTask, TaskAssignment, TaskState } from "@/lib/types";

const collectionRef = () => collection(db, "tasks");

type WatchTasksOptions = {
  locationId?: string;
  partnerOrgId?: string;
  assignment?: TaskAssignment;
  enabled?: boolean;
};

export function watchTasks(
  onChange: (items: SVTask[]) => void,
  onError?: (error: FirestoreError) => void,
  options: WatchTasksOptions = {},
) {
  if (options.enabled === false) {
    return () => undefined;
  }

  const constraints = [];
  if (options.locationId) {
    constraints.push(where("locationId", "==", options.locationId));
  }
  if (options.partnerOrgId) {
    constraints.push(where("partnerOrgId", "==", options.partnerOrgId));
  }
  if (options.assignment) {
    constraints.push(where("assigned_to", "==", options.assignment));
  }
  constraints.push(orderBy("createdAt", "desc"));

  const q = query(collectionRef(), ...constraints);
  return onSnapshot(
    q,
    (snapshot) => {
      const items: SVTask[] = snapshot.docs.map((docSnap) => normalize(docSnap.id, docSnap.data() as Record<string, unknown>));
      onChange(items);
    },
    onError,
  );
}

export async function createTask(input: {
  locationId: string;
  partnerOrgId: string;
  templateId?: string | null;
  name: string;
  assignment: TaskAssignment;
  status?: TaskState;
  duration?: number | null;
  priority?: "low" | "medium" | "high" | null;
  createdBy: string;
}) {
  // Log the payload for debugging purposes
  try {
    const payload = buildPayload(input);
    console.log('Creating task with payload:', payload);
    const docRef = await addDoc(collectionRef(), payload);
    return docRef.id;
  } catch (error) {
    console.error('Firebase error details:', error);
    throw error;
  }
}

export async function updateTask(
  id: string,
  patch: Partial<Omit<SVTask, "id">>,
  updatedBy?: string,
) {
  const ref = doc(db, "tasks", id);
  const payload = sanitizePatch(patch);
  await setDoc(ref, { 
    ...payload, 
    updatedAt: serverTimestamp(),
    ...(updatedBy ? { updatedBy } : {}),
  }, { merge: true });
}

export async function deleteTask(id: string) {
  const ref = doc(db, "tasks", id);
  await deleteDoc(ref);
}

function buildPayload(input: {
  locationId: string;
  partnerOrgId: string;
  templateId?: string | null;
  name: string;
  assignment: TaskAssignment;
  status?: TaskState;
  duration?: number | null;
  priority?: "low" | "medium" | "high" | null;
  createdBy: string;
}) {
  return {
    locationId: input.locationId,
    partnerOrgId: input.partnerOrgId,
    templateId: input.templateId ?? null,
    name: input.name.trim(),
    assignment: input.assignment,
    assigned_to: input.assignment,
    status: input.status ?? "scheduled",
    state: input.status ?? "scheduled",
    duration: input.duration ?? null,
    priority: input.priority ?? null,
    createdBy: input.createdBy,
    assignedToUserId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function sanitizePatch(patch: Partial<Omit<SVTask, "id">>) {
  const data: Record<string, unknown> = {};
  if (typeof patch.name === "string") {
    data.name = patch.name.trim();
  }
  if (typeof patch.assignment === "string") {
    data.assignment = patch.assignment;
    data.assigned_to = patch.assignment;
  }
  if (typeof patch.status === "string") {
    data.status = patch.status;
    data.state = patch.status;
  }
  if (patch.duration !== undefined) {
    data.duration = patch.duration ?? null;
  }
  if (patch.priority !== undefined) {
    data.priority = patch.priority ?? null;
  }
  if (patch.templateId !== undefined) {
    data.templateId = patch.templateId ?? null;
  }
  if (patch.partnerOrgId !== undefined) {
    data.partnerOrgId = patch.partnerOrgId;
  }
  if (patch.locationId !== undefined) {
    data.locationId = patch.locationId;
  }
  if (patch.assignedToUserId !== undefined) {
    data.assignedToUserId = patch.assignedToUserId;
  }
  return data;
}

function normalize(id: string, data: Record<string, unknown>): SVTask {
  return {
    id,
    locationId:
      typeof data.locationId === "string"
        ? data.locationId
        : typeof data.propertyId === "string"
          ? data.propertyId
          : (data.location_id as string) ?? (data.property_id as string),
    partnerOrgId:
      typeof data.partnerOrgId === "string"
        ? data.partnerOrgId
        : (data.partner_org_id as string),
    templateId:
      typeof data.templateId === "string" || data.templateId === null
        ? (data.templateId as string | null)
        : undefined,
    name: typeof data.name === "string" ? data.name : "Untitled task",
    assignment:
      data.assignment === "oem_teleoperator" || data.assignment === "human"
        ? (data.assignment as TaskAssignment)
        : "oem_teleoperator",
    status:
      data.status === "scheduled" ||
      data.status === "available" ||
      data.status === "claimed" ||
      data.status === "in_progress" ||
      data.status === "paused" ||
      data.status === "completed" ||
      data.status === "failed" ||
      data.status === "aborted"
        ? (data.status as TaskState)
        : "scheduled",
    duration:
      typeof data.duration === "number"
        ? data.duration
        : typeof data.durationMin === "number"
          ? (data.durationMin as number)
          : null,
    priority:
      data.priority === "low" ||
      data.priority === "medium" ||
      data.priority === "high"
        ? (data.priority as "low" | "medium" | "high")
        : null,
    createdBy:
      typeof data.createdBy === "string"
        ? data.createdBy
        : (data.created_by as string | undefined) ?? null,
    updatedBy:
      typeof data.updatedBy === "string"
        ? data.updatedBy
        : (data.updated_by as string | undefined) ?? null,
    createdAt: toTimestampLike(data.createdAt ?? data.created_at),
    updatedAt: toTimestampLike(data.updatedAt ?? data.updated_at),
    assignedToUserId:
      typeof data.assignedToUserId === "string"
        ? data.assignedToUserId
        : (data.assigned_to_user_id as string | null),
  };
}
