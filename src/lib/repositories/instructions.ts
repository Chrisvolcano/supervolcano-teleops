/**
 * Instructions Repository
 * Data access layer for instruction CRUD operations
 * Instructions are subcollections under tasks: /locations/{locationId}/tasks/{taskId}/instructions/{instructionId}
 * Uses Firebase Admin SDK for server-side operations
 */

import { adminDb, adminStorage } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "crypto";
import type { Instruction, InstructionInput } from "@/lib/types/instructions";

const COLLECTION = "locations";
const TASKS_SUBCOLLECTION = "tasks";
const INSTRUCTIONS_SUBCOLLECTION = "instructions";

/**
 * Create a new instruction for a task
 */
export async function createInstruction(
  locationId: string,
  taskId: string,
  data: InstructionInput,
  imageUrls: string[],
  videoUrls: string[],
  createdBy: string,
): Promise<string> {
  const instructionId = randomUUID();

  // Auto-calculate step number if not provided
  let stepNumber = data.stepNumber;
  if (!stepNumber) {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .doc(locationId)
      .collection(TASKS_SUBCOLLECTION)
      .doc(taskId)
      .collection(INSTRUCTIONS_SUBCOLLECTION)
      .orderBy("stepNumber", "desc")
      .limit(1)
      .get();

    stepNumber = snapshot.empty ? 1 : ((snapshot.docs[0].data().stepNumber || 0) + 1);
  }

  const instruction: Instruction = {
    id: instructionId,
    taskId,
    locationId,
    title: data.title,
    description: data.description,
    stepNumber: stepNumber || 1,
    room: data.room,
    imageUrls: imageUrls || [],
    videoUrls: videoUrls || [],
    notes: data.notes,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy,
  };

  const docRef = adminDb
    .collection(COLLECTION)
    .doc(locationId)
    .collection(TASKS_SUBCOLLECTION)
    .doc(taskId)
    .collection(INSTRUCTIONS_SUBCOLLECTION)
    .doc(instructionId);

  await docRef.set({
    ...instruction,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return instructionId;
}

/**
 * Get all instructions for a task
 */
export async function getInstructions(
  locationId: string,
  taskId: string,
): Promise<Instruction[]> {
  const snapshot = await adminDb
    .collection(COLLECTION)
    .doc(locationId)
    .collection(TASKS_SUBCOLLECTION)
    .doc(taskId)
    .collection(INSTRUCTIONS_SUBCOLLECTION)
    .orderBy("stepNumber", "asc")
    .get();

  return snapshot.docs.map((doc) => normalizeInstruction(doc.id, doc.data()));
}

/**
 * Get a single instruction by ID
 */
export async function getInstruction(
  locationId: string,
  taskId: string,
  instructionId: string,
): Promise<Instruction | null> {
  const doc = await adminDb
    .collection(COLLECTION)
    .doc(locationId)
    .collection(TASKS_SUBCOLLECTION)
    .doc(taskId)
    .collection(INSTRUCTIONS_SUBCOLLECTION)
    .doc(instructionId)
    .get();

  if (!doc.exists) {
    return null;
  }

  return normalizeInstruction(doc.id, doc.data());
}

/**
 * Update an instruction
 */
export async function updateInstruction(
  locationId: string,
  taskId: string,
  instructionId: string,
  data: Partial<InstructionInput>,
  imageUrls?: string[],
  videoUrls?: string[],
): Promise<void> {
  const updateData: any = {
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (imageUrls !== undefined) updateData.imageUrls = imageUrls;
  if (videoUrls !== undefined) updateData.videoUrls = videoUrls;

  await adminDb
    .collection(COLLECTION)
    .doc(locationId)
    .collection(TASKS_SUBCOLLECTION)
    .doc(taskId)
    .collection(INSTRUCTIONS_SUBCOLLECTION)
    .doc(instructionId)
    .update(updateData);
}

/**
 * Delete an instruction and its media files
 */
export async function deleteInstruction(
  locationId: string,
  taskId: string,
  instructionId: string,
): Promise<void> {
  // Get instruction to retrieve media URLs
  const instruction = await getInstruction(locationId, taskId, instructionId);

  if (instruction) {
    // Delete all media from Storage
    const allMediaUrls = [
      ...(instruction.imageUrls || []),
      ...(instruction.videoUrls || []),
    ];
    if (allMediaUrls.length > 0) {
      await deleteMediaFiles(allMediaUrls);
    }
  }

  // Delete instruction document
  await adminDb
    .collection(COLLECTION)
    .doc(locationId)
    .collection(TASKS_SUBCOLLECTION)
    .doc(taskId)
    .collection(INSTRUCTIONS_SUBCOLLECTION)
    .doc(instructionId)
    .delete();
}

/**
 * Delete media files from Firebase Storage
 */
async function deleteMediaFiles(urls: string[]): Promise<void> {
  if (!urls || urls.length === 0) {
    return;
  }

  const bucket = adminStorage.bucket();
  const deletePromises = urls.map(async (url) => {
    try {
      // Extract path from Firebase Storage URL
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/o\/(.+)\?/);
      if (pathMatch) {
        const encodedPath = pathMatch[1];
        const decodedPath = decodeURIComponent(encodedPath);
        const file = bucket.file(decodedPath);
        await file.delete();
        console.log(`[repo] Deleted media: ${decodedPath}`);
      }
    } catch (error: any) {
      console.warn(`[repo] Failed to delete media ${url}:`, error.message);
    }
  });

  await Promise.all(deletePromises);
}

/**
 * Normalize Firestore document to Instruction type
 */
function normalizeInstruction(id: string, data: any): Instruction {
  return {
    id,
    taskId: data.taskId || "",
    locationId: data.locationId || "",
    title: data.title || "",
    description: data.description || "",
    stepNumber: data.stepNumber || 1,
    room: data.room,
    imageUrls: data.imageUrls || [],
    videoUrls: data.videoUrls || [],
    notes: data.notes,
    createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
    createdBy: data.createdBy || "",
  };
}
