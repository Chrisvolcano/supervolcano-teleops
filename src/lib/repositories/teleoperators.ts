/**
 * Teleoperators Repository
 * Data access layer for teleoperator CRUD operations
 * Uses Firebase Admin SDK for server-side operations (more reliable than client SDK)
 */

import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import type { Teleoperator, TeleoperatorStatus, UserRole } from "@/lib/types";
import { randomUUID } from "crypto";

const COLLECTION = "teleoperators";

/**
 * Create a new teleoperator
 * Also creates Firebase Auth user and sets custom claims
 */
export async function createTeleoperator(
  data: Omit<Teleoperator, "teleoperatorId" | "uid" | "createdAt" | "tasksCompleted" | "hoursWorked">,
  createdBy: string,
): Promise<{ teleoperatorId: string; uid: string }> {
  const teleoperatorId = randomUUID();
  const now = new Date();

  // Create Firebase Auth user first
  let uid: string;
  try {
    const userRecord = await adminAuth.createUser({
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoUrl,
      disabled: false,
    });
    uid = userRecord.uid;

    // Set custom claims
    await adminAuth.setCustomUserClaims(uid, {
      role: "teleoperator" as UserRole,
      partnerId: data.partnerOrgId,
      teleoperatorId: teleoperatorId,
    });
  } catch (error: any) {
    if (error.code === "auth/email-already-exists") {
      // User already exists, get their UID
      const existingUser = await adminAuth.getUserByEmail(data.email);
      uid = existingUser.uid;
      // Update custom claims
      await adminAuth.setCustomUserClaims(uid, {
        role: "teleoperator" as UserRole,
        partnerId: data.partnerOrgId,
        teleoperatorId: teleoperatorId,
      });
    } else {
      throw new Error(`Failed to create Firebase Auth user: ${error.message}`);
    }
  }

  // Create teleoperator document
  const teleoperator: Teleoperator = {
    teleoperatorId,
    uid,
    email: data.email,
    displayName: data.displayName,
    photoUrl: data.photoUrl,
    partnerOrgId: data.partnerOrgId,
    currentStatus: data.currentStatus || "offline",
    certifications: data.certifications || [],
    robotTypesQualified: data.robotTypesQualified || [],
    schedule: data.schedule,
    tasksCompleted: 0,
    hoursWorked: 0,
    phone: data.phone,
    preferredContactMethod: data.preferredContactMethod,
    createdAt: now,
    createdBy,
  };

  await adminDb.collection(COLLECTION).doc(teleoperatorId).set({
    ...teleoperator,
    createdAt: adminDb.FieldValue.serverTimestamp(),
  });

  return { teleoperatorId, uid };
}

/**
 * Get teleoperator by ID
 */
export async function getTeleoperator(teleoperatorId: string): Promise<Teleoperator | null> {
  const doc = await adminDb.collection(COLLECTION).doc(teleoperatorId).get();
  if (!doc.exists) {
    return null;
  }
  return normalizeTeleoperator(doc.id, doc.data());
}

/**
 * Get teleoperator by Firebase Auth UID
 */
export async function getTeleoperatorByUid(uid: string): Promise<Teleoperator | null> {
  const snapshot = await adminDb.collection(COLLECTION).where("uid", "==", uid).limit(1).get();
  if (snapshot.empty) {
    return null;
  }
  const doc = snapshot.docs[0];
  return normalizeTeleoperator(doc.id, doc.data());
}

/**
 * List teleoperators (with optional partner filter)
 */
export async function listTeleoperators(
  partnerOrgId?: string,
  status?: TeleoperatorStatus,
): Promise<Teleoperator[]> {
  let query: FirebaseFirestore.Query = adminDb.collection(COLLECTION);

  if (partnerOrgId) {
    query = query.where("partnerOrgId", "==", partnerOrgId);
  }

  if (status) {
    query = query.where("currentStatus", "==", status);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => normalizeTeleoperator(doc.id, doc.data()));
}

/**
 * Update teleoperator
 */
export async function updateTeleoperator(
  teleoperatorId: string,
  updates: Partial<Omit<Teleoperator, "teleoperatorId" | "uid" | "createdAt" | "createdBy">>,
): Promise<void> {
  const updateData: any = {
    ...updates,
    updatedAt: adminDb.FieldValue.serverTimestamp(),
  };

  // If updating email, also update Firebase Auth
  if (updates.email) {
    const teleoperator = await getTeleoperator(teleoperatorId);
    if (teleoperator) {
      await adminAuth.updateUser(teleoperator.uid, {
        email: updates.email,
      });
    }
  }

  await adminDb.collection(COLLECTION).doc(teleoperatorId).update(updateData);
}

/**
 * Update teleoperator status
 */
export async function updateTeleoperatorStatus(
  teleoperatorId: string,
  status: TeleoperatorStatus,
): Promise<void> {
  await adminDb.collection(COLLECTION).doc(teleoperatorId).update({
    currentStatus: status,
    lastActiveAt: adminDb.FieldValue.serverTimestamp(),
    updatedAt: adminDb.FieldValue.serverTimestamp(),
  });
}

/**
 * Delete teleoperator (soft delete - mark as inactive)
 */
export async function deleteTeleoperator(teleoperatorId: string): Promise<void> {
  const teleoperator = await getTeleoperator(teleoperatorId);
  if (!teleoperator) {
    throw new Error("Teleoperator not found");
  }

  // Disable Firebase Auth user
  await adminAuth.updateUser(teleoperator.uid, {
    disabled: true,
  });

  // Mark as offline
  await updateTeleoperatorStatus(teleoperatorId, "offline");
}

/**
 * Normalize Firestore document to Teleoperator type
 */
function normalizeTeleoperator(id: string, data: any): Teleoperator {
  return {
    teleoperatorId: id,
    uid: data.uid || "",
    email: data.email || "",
    displayName: data.displayName || "",
    photoUrl: data.photoUrl,
    partnerOrgId: data.partnerOrgId || "",
    currentStatus: data.currentStatus || "offline",
    certifications: data.certifications || [],
    robotTypesQualified: data.robotTypesQualified || [],
    schedule: data.schedule,
    tasksCompleted: data.tasksCompleted || 0,
    averageRating: data.averageRating,
    hoursWorked: data.hoursWorked || 0,
    phone: data.phone,
    preferredContactMethod: data.preferredContactMethod,
    createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
    lastActiveAt: data.lastActiveAt?.toDate?.() || data.lastActiveAt,
    createdBy: data.createdBy,
  };
}

