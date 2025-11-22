/**
 * Locations Repository
 * Data access layer for location CRUD operations
 * Uses Firebase Admin SDK for server-side operations
 */

import { adminDb } from "@/lib/firebaseAdmin";
import type { Location, LocationStatus } from "@/lib/types";
import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "crypto";

const COLLECTION = "locations";

/**
 * Create a new location
 */
export async function createLocation(
  data: Omit<Location, "locationId" | "createdAt" | "updatedAt" | "assignedTeleoperatorIds">,
  createdBy: string,
): Promise<string> {
  const locationId = randomUUID();
  const now = new Date();

  const location: Location = {
    locationId,
    name: data.name,
    address: data.address,
    type: data.type,
    primaryContact: data.primaryContact,
    partnerOrgId: data.partnerOrgId,
    assignedTeleoperatorIds: [],
    accessInstructions: data.accessInstructions,
    entryCode: data.entryCode,
    parkingInfo: data.parkingInfo,
    status: data.status || "active",
    coordinates: data.coordinates,
    createdAt: now,
    updatedAt: now,
    createdBy,
  };

  await adminDb.collection(COLLECTION).doc(locationId).set({
    ...location,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return locationId;
}

/**
 * Get location by ID
 */
export async function getLocation(locationId: string): Promise<Location | null> {
  const doc = await adminDb.collection(COLLECTION).doc(locationId).get();
  if (!doc.exists) {
    return null;
  }
  return normalizeLocation(doc.id, doc.data());
}

/**
 * List locations (with optional partner filter)
 */
export async function listLocations(
  partnerOrgId?: string,
  status?: LocationStatus,
): Promise<Location[]> {
  let query: FirebaseFirestore.Query = adminDb.collection(COLLECTION);

  if (partnerOrgId) {
    query = query.where("partnerOrgId", "==", partnerOrgId);
  }

  if (status) {
    query = query.where("status", "==", status);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => normalizeLocation(doc.id, doc.data()));
}

/**
 * Update location
 */
export async function updateLocation(
  locationId: string,
  updates: Partial<Omit<Location, "locationId" | "createdAt" | "createdBy">>,
): Promise<void> {
  const updateData: any = {
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await adminDb.collection(COLLECTION).doc(locationId).update(updateData);
}

/**
 * Assign teleoperator to location
 */
export async function assignTeleoperatorToLocation(
  locationId: string,
  teleoperatorId: string,
): Promise<void> {
  const location = await getLocation(locationId);
  if (!location) {
    throw new Error("Location not found");
  }

  if (!location.assignedTeleoperatorIds.includes(teleoperatorId)) {
    await adminDb.collection(COLLECTION).doc(locationId).update({
      assignedTeleoperatorIds: FieldValue.arrayUnion(teleoperatorId),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

/**
 * Unassign teleoperator from location
 */
export async function unassignTeleoperatorFromLocation(
  locationId: string,
  teleoperatorId: string,
): Promise<void> {
  await adminDb.collection(COLLECTION).doc(locationId).update({
    assignedTeleoperatorIds: FieldValue.arrayRemove(teleoperatorId),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Delete location (soft delete - mark as inactive)
 */
export async function deleteLocation(locationId: string): Promise<void> {
  await adminDb.collection(COLLECTION).doc(locationId).update({
    status: "inactive",
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Normalize Firestore document to Location type
 */
function normalizeLocation(id: string, data: any): Location {
  return {
    locationId: id,
    name: data.name || "",
    address: data.address || "",
    type: data.type || "other",
    primaryContact: data.primaryContact,
    partnerOrgId: data.partnerOrgId || "",
    assignedTeleoperatorIds: data.assignedTeleoperatorIds || [],
    accessInstructions: data.accessInstructions,
    entryCode: data.entryCode,
    parkingInfo: data.parkingInfo,
    status: data.status || "active",
    coordinates: data.coordinates,
    createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
    createdBy: data.createdBy,
  };
}

