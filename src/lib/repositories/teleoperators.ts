/**
 * Teleoperators Repository
 * Data access layer for teleoperator CRUD operations
 * Uses Firebase Admin SDK for server-side operations (more reliable than client SDK)
 * 
 * Collection: teleoperators
 * Database: default (nam5 multi-region)
 */

import { adminDb, adminAuth, getAdminApp } from "@/lib/firebaseAdmin";
import type { Teleoperator, TeleoperatorStatus, UserRole } from "@/lib/types";
import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "crypto";

const COLLECTION = "teleoperators";

/**
 * Generate a random password for new users
 */
function generateRandomPassword(): string {
  const length = 12;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

/**
 * Create a new teleoperator or org_manager
 * Also creates Firebase Auth user and sets custom claims
 */
export async function createTeleoperator(
  data: Omit<Teleoperator, "teleoperatorId" | "uid" | "createdAt" | "tasksCompleted" | "hoursWorked"> & {
    role?: "org_manager" | "oem_teleoperator"; // Optional role, defaults to teleoperator
  },
  createdBy: string,
): Promise<{ teleoperatorId: string; uid: string; password: string }> {
  const teleoperatorId = randomUUID();
  const now = new Date();
  const role: UserRole = data.role || "oem_teleoperator";
  const tempPassword = generateRandomPassword();

  // Create Firebase Auth user first
  let uid: string;
  try {
    const userRecord = await adminAuth.createUser({
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoUrl,
      password: tempPassword,
      disabled: false,
    });
    uid = userRecord.uid;

    // Set custom claims based on role
    const customClaims: any = {
      role: role,
      partnerId: data.partnerOrgId,
      organizationId: data.organizationId,
    };

    // Only set teleoperatorId for teleoperators
    if (role === "oem_teleoperator") {
      customClaims.teleoperatorId = teleoperatorId;
    }

    await adminAuth.setCustomUserClaims(uid, customClaims);
  } catch (error: any) {
    if (error.code === "auth/email-already-exists") {
      // User already exists, get their UID
      const existingUser = await adminAuth.getUserByEmail(data.email);
      uid = existingUser.uid;
      
      // Enable the user and update password
      await adminAuth.updateUser(uid, {
        disabled: false,
        password: tempPassword,
        displayName: data.displayName,
        photoURL: data.photoUrl,
      });
      
      // Update custom claims
      const customClaims: any = {
        role: role,
        partnerId: data.partnerOrgId,
        organizationId: data.organizationId,
      };

      if (role === "oem_teleoperator") {
        customClaims.teleoperatorId = teleoperatorId;
      }

      await adminAuth.setCustomUserClaims(uid, customClaims);
    } else {
      throw new Error(`Failed to create Firebase Auth user: ${error.message}`);
    }
  }

  // Create teleoperator document (used for both teleoperators and org_managers)
  const teleoperator: Teleoperator = {
    teleoperatorId,
    uid,
    email: data.email,
    displayName: data.displayName,
    photoUrl: data.photoUrl,
    partnerOrgId: data.partnerOrgId,
    organizationId: data.organizationId,
    organizationName: data.organizationName,
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
    role: role, // Store role in teleoperator document for easier querying
    createdAt: FieldValue.serverTimestamp(),
  });

  // Create users collection document with role
  await adminDb.collection("users").doc(uid).set({
    email: data.email,
    displayName: data.displayName,
    role: role,
    partnerId: data.partnerOrgId,
    organizationId: data.organizationId,
    teleoperatorId: role === "oem_teleoperator" ? teleoperatorId : null,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { teleoperatorId, uid, password: tempPassword };
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
  const app = getAdminApp();
  console.log("[repo] listTeleoperators - Starting", {
    collection: COLLECTION,
    partnerOrgId,
    status,
    projectId: app.options.projectId,
  });

  let query: FirebaseFirestore.Query = adminDb.collection(COLLECTION);

  if (partnerOrgId) {
    query = query.where("partnerOrgId", "==", partnerOrgId);
    console.log("[repo] listTeleoperators - Filtering by partnerOrgId:", partnerOrgId);
  }

  if (status) {
    query = query.where("currentStatus", "==", status);
    console.log("[repo] listTeleoperators - Filtering by status:", status);
  }

  try {
    console.log("[repo] listTeleoperators - Executing Firestore query...");
    const snapshot = await query.get();
    console.log("[repo] listTeleoperators - ✅ Query successful, found", snapshot.docs.length, "documents");
    return snapshot.docs.map((doc) => normalizeTeleoperator(doc.id, doc.data()));
  } catch (error: any) {
    console.error("[repo] listTeleoperators - ❌ Query failed:", {
      code: error.code,
      message: error.message,
      stack: error.stack,
      collection: COLLECTION,
      partnerOrgId,
      status,
    });
    throw error;
  }
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
    updatedAt: FieldValue.serverTimestamp(),
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
    lastActiveAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Delete teleoperator (hard delete - removes from Firestore and disables Auth user)
 */
export async function deleteTeleoperator(teleoperatorId: string): Promise<void> {
  const teleoperator = await getTeleoperator(teleoperatorId);
  if (!teleoperator) {
    throw new Error("Teleoperator not found");
  }

  console.log("[repo] deleteTeleoperator - Deleting teleoperator:", teleoperatorId);

  // Disable Firebase Auth user
  try {
    await adminAuth.updateUser(teleoperator.uid, {
      disabled: true,
    });
    console.log("[repo] deleteTeleoperator - Disabled Firebase Auth user:", teleoperator.uid);
  } catch (error: any) {
    console.error("[repo] deleteTeleoperator - Error disabling Auth user:", error);
    // Continue with deletion even if Auth update fails
  }

  // Delete the Firestore document
  try {
    await adminDb.collection(COLLECTION).doc(teleoperatorId).delete();
    console.log("[repo] deleteTeleoperator - Deleted Firestore document:", teleoperatorId);
  } catch (error: any) {
    console.error("[repo] deleteTeleoperator - Error deleting Firestore document:", error);
    throw new Error(`Failed to delete teleoperator document: ${error.message}`);
  }

  // Also delete the user document in the users collection if it exists
  try {
    const userSnapshot = await adminDb
      .collection("users")
      .where("teleoperatorId", "==", teleoperatorId)
      .limit(1)
      .get();

    if (!userSnapshot.empty) {
      await userSnapshot.docs[0].ref.delete();
      console.log("[repo] deleteTeleoperator - Deleted user document");
    }
  } catch (error: any) {
    console.error("[repo] deleteTeleoperator - Error deleting user document:", error);
    // Don't throw - user document deletion is optional
  }

  console.log("[repo] deleteTeleoperator - Successfully deleted teleoperator:", teleoperatorId);
}

/**
 * Get all locations assigned to this teleoperator with task and instruction counts
 */
export async function getAssignedLocationsWithCounts(teleoperatorId: string) {
  console.log("[repo] getAssignedLocationsWithCounts - Fetching for teleoperator:", teleoperatorId);
  
  const locationsSnapshot = await adminDb
    .collection("locations")
    .where("assignedTeleoperatorIds", "array-contains", teleoperatorId)
    .where("status", "==", "active")
    .get();

  console.log("[repo] getAssignedLocationsWithCounts - Found", locationsSnapshot.docs.length, "locations");

  const locations = [];

  for (const locationDoc of locationsSnapshot.docs) {
    const locationData = locationDoc.data();
    
    // Get all active tasks for this location
    const tasksSnapshot = await locationDoc.ref
      .collection("tasks")
      .where("status", "==", "active")
      .get();

    let totalInstructions = 0;
    for (const taskDoc of tasksSnapshot.docs) {
      const instructionsSnapshot = await taskDoc.ref
        .collection("instructions")
        .get();
      totalInstructions += instructionsSnapshot.size;
    }

    locations.push({
      locationId: locationDoc.id,
      ...locationData,
      taskCount: tasksSnapshot.size,
      instructionCount: totalInstructions,
    });
  }

  console.log("[repo] getAssignedLocationsWithCounts - Returning", locations.length, "locations with counts");
  return locations;
}

/**
 * Get all teleoperators for a specific organization
 */
export async function getTeleoperatorsByOrganization(organizationId: string): Promise<Teleoperator[]> {
  try {
    console.log("[repo] getTeleoperatorsByOrganization - Fetching for organization:", organizationId);
    
    // Query by organizationId and sort in memory to avoid composite index
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .get();

    console.log("[repo] getTeleoperatorsByOrganization - Query returned", snapshot.size, "documents");

    const teleoperators = snapshot.docs.map((doc) => normalizeTeleoperator(doc.id, doc.data()));
    
    // Sort by display name in memory
    return teleoperators.sort((a, b) => a.displayName.localeCompare(b.displayName));
  } catch (error: any) {
    console.error("[repo] getTeleoperatorsByOrganization - Error:", error);
    throw error;
  }
}

/**
 * Check if teleoperator's organization has access to location
 */
export async function canAccessLocation(organizationId: string, locationId: string): Promise<boolean> {
  const locationDoc = await adminDb.collection("locations").doc(locationId).get();
  
  if (!locationDoc.exists) {
    return false;
  }

  const location = locationDoc.data();
  
  return location?.assignedOrganizationId === organizationId;
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
    organizationId: data.organizationId || "",
    organizationName: data.organizationName,
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

