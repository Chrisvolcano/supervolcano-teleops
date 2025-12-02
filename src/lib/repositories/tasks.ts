/**
 * Tasks Repository
 * Data access layer for task CRUD operations
 * Tasks are subcollections under locations: /locations/{locationId}/tasks/{taskId}
 * Uses Firebase Admin SDK for server-side operations
 */

import { adminDb, adminStorage } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "crypto";
import type { Task, TaskInput } from "@/lib/types/tasks";

const COLLECTION = "locations";
const SUBCOLLECTION = "tasks";

/**
 * Create a new task for a location with instructions
 */
export async function createTask(
  locationId: string,
  data: TaskInput,
  createdBy: string,
  instructions?: Array<{
    data: {
      title: string;
      description: string;
      room?: string;
      notes?: string;
      stepNumber?: number;
    };
    imageUrls: string[];
    videoUrls: string[];
  }>,
): Promise<string> {
  const taskId = randomUUID();
  const now = new Date();

  const task: Task = {
    id: taskId,
    locationId,
    title: data.title,
    description: data.description,
    category: data.category,
    priority: data.priority,
    estimatedDuration: data.estimatedDuration,
    assignmentType: data.assignmentType,
    assignedTeleoperatorId: data.assignedTeleoperatorId,
    assignedTeleoperatorName: data.assignedTeleoperatorName,
    assignedHumanName: data.assignedHumanName,
    status: data.status,
    createdAt: now,
    updatedAt: now,
    createdBy,
  };

  const taskRef = adminDb
    .collection(COLLECTION)
    .doc(locationId)
    .collection(SUBCOLLECTION)
    .doc(taskId);

  console.log("[repo] createTask - Setting task document:", {
    locationId,
    taskId,
    path: taskRef.path,
    title: task.title,
    assignmentType: task.assignmentType,
    instructionCount: instructions?.length || 0,
  });

  // Create task
  await taskRef.set({
    ...task,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Create instructions in a batch if provided
  if (instructions && instructions.length > 0) {
    const batch = adminDb.batch();
    
    instructions.forEach((instruction, index) => {
      const instructionId = randomUUID();
      const instructionRef = taskRef.collection("instructions").doc(instructionId);
      
      batch.set(instructionRef, {
        id: instructionId,
        taskId,
        locationId,
        title: instruction.data.title,
        description: instruction.data.description,
        room: instruction.data.room,
        notes: instruction.data.notes,
        stepNumber: instruction.data.stepNumber || index + 1,
        imageUrls: instruction.imageUrls || [],
        videoUrls: instruction.videoUrls || [],
        createdBy,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    console.log("[repo] createTask - Created", instructions.length, "instructions");
  }

  console.log("[repo] createTask - Task and instructions created successfully");

  return taskId;
}

/**
 * Get all tasks for a location
 */
export async function getTasks(
  locationId: string,
  status?: "active" | "draft" | "archived",
): Promise<Task[]> {
  try {
    console.log("[repo] getTasks - Starting", { locationId, status });

    // Get all tasks for the location (no filters/ordering to avoid index issues)
    const snapshot = await adminDb
      .collection(COLLECTION)
      .doc(locationId)
      .collection(SUBCOLLECTION)
      .get();

    console.log("[repo] getTasks - Fetched", snapshot.docs.length, "tasks");

    // Normalize and filter in memory
    let tasks = snapshot.docs.map((doc) => normalizeTask(doc.id, doc.data()));

    // Filter by status if provided
    if (status) {
      tasks = tasks.filter((task) => task.status === status);
      console.log("[repo] getTasks - Filtered to", tasks.length, "tasks with status:", status);
    }

    // Sort by priority (descending), then by createdAt (descending)
    tasks.sort((a, b) => {
      // First sort by priority (1 = highest, 5 = lowest)
      if (a.priority !== b.priority) {
        return a.priority - b.priority; // Ascending (1 comes before 5)
      }
      // Then sort by createdAt (newest first)
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending (newest first)
    });

    console.log("[repo] getTasks - Returning", tasks.length, "sorted tasks");
    return tasks;
  } catch (error: any) {
    console.error("[repo] getTasks - Error:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Get tasks assigned to a specific teleoperator
 */
export async function getTasksForTeleoperator(
  locationId: string,
  teleoperatorId: string,
): Promise<Task[]> {
  const snapshot = await adminDb
    .collection(COLLECTION)
    .doc(locationId)
    .collection(SUBCOLLECTION)
    .where("assignmentType", "==", "oem_teleoperator")
    .where("assignedTeleoperatorId", "==", teleoperatorId)
    .where("status", "==", "active")
    .orderBy("priority", "desc")
    .get();

  return snapshot.docs.map((doc) => normalizeTask(doc.id, doc.data()));
}

/**
 * Get a single task by ID
 */
export async function getTask(
  locationId: string,
  taskId: string,
): Promise<Task | null> {
  const doc = await adminDb
    .collection(COLLECTION)
    .doc(locationId)
    .collection(SUBCOLLECTION)
    .doc(taskId)
    .get();

  if (!doc.exists) {
    return null;
  }

  return normalizeTask(doc.id, doc.data());
}

/**
 * Update a task and its instructions
 */
export async function updateTask(
  locationId: string,
  taskId: string,
  updates: Partial<TaskInput>,
  instructions?: Array<{
    data: {
      title: string;
      description: string;
      room?: string;
      notes?: string;
      stepNumber?: number;
    };
    imageUrls: string[];
    videoUrls: string[];
    existingId?: string; // For existing instructions to update
  }>,
): Promise<void> {
  const taskRef = adminDb
    .collection(COLLECTION)
    .doc(locationId)
    .collection(SUBCOLLECTION)
    .doc(taskId);

  // Update task
  const updateData: any = {
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await taskRef.update(updateData);

  // Handle instructions if provided
  if (instructions !== undefined) {
    // Get existing instructions
    const existingSnapshot = await taskRef.collection("instructions").get();
    const existingInstructions = existingSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        imageUrls: (data.imageUrls as string[]) || [],
        videoUrls: (data.videoUrls as string[]) || [],
        createdBy: (data.createdBy as string) || "system",
        ...data,
      };
    });

    const batch = adminDb.batch();
    const existingIds = new Set(
      instructions.filter((inst) => inst.existingId).map((inst) => inst.existingId!),
    );

    // Delete instructions that were removed
    existingInstructions.forEach((existing) => {
      if (!existingIds.has(existing.id)) {
        // Delete media files
        const allMediaUrls = [
          ...(existing.imageUrls || []),
          ...(existing.videoUrls || []),
        ];
        if (allMediaUrls.length > 0) {
          // Delete media files asynchronously (don't block the batch)
          deleteMediaFiles(allMediaUrls).catch((err) => {
            console.warn("[repo] updateTask - Failed to delete some media files:", err);
          });
        }
        batch.delete(taskRef.collection("instructions").doc(existing.id));
      }
    });

    // Update or create instructions
    instructions.forEach((instruction, index) => {
      if (instruction.existingId) {
        // Update existing instruction
        const instructionRef = taskRef.collection("instructions").doc(instruction.existingId);
        batch.update(instructionRef, {
          title: instruction.data.title,
          description: instruction.data.description,
          room: instruction.data.room,
          notes: instruction.data.notes,
          stepNumber: instruction.data.stepNumber || index + 1,
          imageUrls: instruction.imageUrls || [],
          videoUrls: instruction.videoUrls || [],
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        // Create new instruction
        const instructionId = randomUUID();
        const instructionRef = taskRef.collection("instructions").doc(instructionId);
        batch.set(instructionRef, {
          id: instructionId,
          taskId,
          locationId,
          title: instruction.data.title,
          description: instruction.data.description,
          room: instruction.data.room,
          notes: instruction.data.notes,
          stepNumber: instruction.data.stepNumber || index + 1,
          imageUrls: instruction.imageUrls || [],
          videoUrls: instruction.videoUrls || [],
          createdBy: existingInstructions[0]?.createdBy || "system", // Use existing or fallback
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });

    await batch.commit();
    console.log("[repo] updateTask - Updated", instructions.length, "instructions");
  }
}

/**
 * Delete a task and all its instructions
 */
export async function deleteTask(
  locationId: string,
  taskId: string,
): Promise<void> {
  // Get all instructions first to delete their media
  const instructionsSnapshot = await adminDb
    .collection(COLLECTION)
    .doc(locationId)
    .collection(SUBCOLLECTION)
    .doc(taskId)
    .collection("instructions")
    .get();

  // Delete all instruction media files
  for (const doc of instructionsSnapshot.docs) {
    const instruction = doc.data();
    const allMediaUrls = [
      ...(instruction.imageUrls || []),
      ...(instruction.videoUrls || []),
    ];
    if (allMediaUrls.length > 0) {
      await deleteMediaFiles(allMediaUrls);
    }
  }

  // Delete all instruction documents
  const batch = adminDb.batch();
  instructionsSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  // Delete the task
  batch.delete(
    adminDb
      .collection(COLLECTION)
      .doc(locationId)
      .collection(SUBCOLLECTION)
      .doc(taskId),
  );

  await batch.commit();
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
 * Normalize Firestore document to Task type
 */
function normalizeTask(id: string, data: any): Task {
  return {
    id,
    locationId: data.locationId || "",
    title: data.title || "",
    description: data.description || "",
    category: data.category || "cleaning",
    priority: data.priority || 3,
    estimatedDuration: data.estimatedDuration || 0,
    assignmentType: data.assignmentType || "unassigned",
    assignedTeleoperatorId: data.assignedTeleoperatorId,
    assignedTeleoperatorName: data.assignedTeleoperatorName,
    assignedHumanName: data.assignedHumanName,
    status: data.status || "active",
    createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
    createdBy: data.createdBy || "",
  };
}
