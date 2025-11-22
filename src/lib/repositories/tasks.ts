/**
 * Tasks Repository
 * Data access layer for task CRUD operations
 * Uses Firebase Admin SDK for server-side operations
 */

import { adminDb } from "@/lib/firebaseAdmin";
import type { Task, TaskStatus } from "@/lib/types";
import { randomUUID } from "crypto";

const COLLECTION = "tasks";

/**
 * Create a new task
 */
export async function createTask(
  data: Omit<Task, "taskId" | "createdAt" | "updatedAt" | "status" | "photosBefore" | "photosAfter" | "instructionIds">,
  createdBy: string,
): Promise<string> {
  const taskId = randomUUID();
  const now = new Date();

  const task: Task = {
    taskId,
    locationId: data.locationId,
    assignedTeleoperatorId: data.assignedTeleoperatorId,
    assignedPartnerId: data.assignedPartnerId,
    status: data.status || "unassigned",
    scheduledFor: data.scheduledFor,
    estimatedDuration: data.estimatedDuration,
    recurringPattern: data.recurringPattern,
    taskType: data.taskType,
    instructionIds: data.instructionIds || [],
    title: data.title,
    description: data.description,
    specialRequirements: data.specialRequirements,
    photosBefore: [],
    photosAfter: [],
    priority: data.priority || 3,
    createdAt: now,
    updatedAt: now,
    createdBy,
  };

  await adminDb.collection(COLLECTION).doc(taskId).set({
    ...task,
    createdAt: adminDb.FieldValue.serverTimestamp(),
    updatedAt: adminDb.FieldValue.serverTimestamp(),
  });

  return taskId;
}

/**
 * Get task by ID
 */
export async function getTask(taskId: string): Promise<Task | null> {
  const doc = await adminDb.collection(COLLECTION).doc(taskId).get();
  if (!doc.exists) {
    return null;
  }
  return normalizeTask(doc.id, doc.data());
}

/**
 * List tasks (with optional filters)
 */
export async function listTasks(filters: {
  partnerOrgId?: string;
  locationId?: string;
  assignedTeleoperatorId?: string;
  status?: TaskStatus;
}): Promise<Task[]> {
  let query: FirebaseFirestore.Query = adminDb.collection(COLLECTION);

  if (filters.partnerOrgId) {
    query = query.where("assignedPartnerId", "==", filters.partnerOrgId);
  }

  if (filters.locationId) {
    query = query.where("locationId", "==", filters.locationId);
  }

  if (filters.assignedTeleoperatorId) {
    query = query.where("assignedTeleoperatorId", "==", filters.assignedTeleoperatorId);
  }

  if (filters.status) {
    query = query.where("status", "==", filters.status);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => normalizeTask(doc.id, doc.data()));
}

/**
 * Update task
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Omit<Task, "taskId" | "createdAt" | "createdBy">>,
): Promise<void> {
  const updateData: any = {
    ...updates,
    updatedAt: adminDb.FieldValue.serverTimestamp(),
  };

  await adminDb.collection(COLLECTION).doc(taskId).update(updateData);
}

/**
 * Assign task to teleoperator
 */
export async function assignTaskToTeleoperator(
  taskId: string,
  teleoperatorId: string,
): Promise<void> {
  await adminDb.collection(COLLECTION).doc(taskId).update({
    assignedTeleoperatorId: teleoperatorId,
    status: "assigned",
    updatedAt: adminDb.FieldValue.serverTimestamp(),
  });
}

/**
 * Start task (change status to in-progress)
 */
export async function startTask(taskId: string, teleoperatorId: string): Promise<void> {
  await adminDb.collection(COLLECTION).doc(taskId).update({
    status: "in-progress",
    startedAt: adminDb.FieldValue.serverTimestamp(),
    updatedAt: adminDb.FieldValue.serverTimestamp(),
  });
}

/**
 * Complete task
 */
export async function completeTask(
  taskId: string,
  data: {
    photosAfter?: string[];
    teleoperatorNotes?: string;
    issuesEncountered?: string[];
  },
): Promise<void> {
  await adminDb.collection(COLLECTION).doc(taskId).update({
    status: "completed",
    completedAt: adminDb.FieldValue.serverTimestamp(),
    photosAfter: data.photosAfter || [],
    teleoperatorNotes: data.teleoperatorNotes,
    issuesEncountered: data.issuesEncountered || [],
    updatedAt: adminDb.FieldValue.serverTimestamp(),
  });
}

/**
 * Delete task (soft delete - mark as cancelled)
 */
export async function deleteTask(taskId: string): Promise<void> {
  await adminDb.collection(COLLECTION).doc(taskId).update({
    status: "cancelled",
    updatedAt: adminDb.FieldValue.serverTimestamp(),
  });
}

/**
 * Normalize Firestore document to Task type
 */
function normalizeTask(id: string, data: any): Task {
  return {
    taskId: id,
    locationId: data.locationId || "",
    assignedTeleoperatorId: data.assignedTeleoperatorId,
    assignedPartnerId: data.assignedPartnerId || "",
    status: data.status || "unassigned",
    scheduledFor: data.scheduledFor?.toDate?.() || data.scheduledFor,
    estimatedDuration: data.estimatedDuration,
    recurringPattern: data.recurringPattern,
    taskType: data.taskType || "cleaning",
    instructionIds: data.instructionIds || [],
    title: data.title || "",
    description: data.description,
    specialRequirements: data.specialRequirements,
    startedAt: data.startedAt?.toDate?.() || data.startedAt,
    completedAt: data.completedAt?.toDate?.() || data.completedAt,
    executionLog: data.executionLog,
    issuesEncountered: data.issuesEncountered,
    photosBefore: data.photosBefore || [],
    photosAfter: data.photosAfter || [],
    qualityScore: data.qualityScore,
    verifiedBy: data.verifiedBy,
    teleoperatorNotes: data.teleoperatorNotes,
    customerFeedback: data.customerFeedback,
    priority: data.priority || 3,
    createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
    createdBy: data.createdBy,
  };
}

