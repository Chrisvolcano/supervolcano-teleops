/**
 * Organizations Repository
 * Data access layer for organization CRUD operations
 * Uses Firebase Admin SDK for server-side operations
 */

import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "crypto";

const COLLECTION = "organizations";

export interface Organization {
  id: string;
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: "active" | "inactive";
  partnerId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string;
}

export interface OrganizationInput {
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: "active" | "inactive";
  partnerId: string;
}

/**
 * Create a new organization
 */
export async function createOrganization(
  data: OrganizationInput,
  createdBy: string,
): Promise<string> {
  const organizationId = randomUUID();
  const now = new Date();

  const organization: Organization = {
    id: organizationId,
    name: data.name,
    contactName: data.contactName,
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone,
    status: data.status || "active",
    partnerId: data.partnerId,
    createdAt: now,
    updatedAt: now,
    createdBy,
  };

  await adminDb.collection(COLLECTION).doc(organizationId).set({
    ...organization,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return organizationId;
}

/**
 * Get all organizations (optionally filtered by partner)
 */
export async function getOrganizations(partnerId?: string): Promise<Organization[]> {
  try {
    console.log("[repo] getOrganizations - Starting", { partnerId, collection: COLLECTION });

    let query: FirebaseFirestore.Query = adminDb.collection(COLLECTION);

    // Always filter by status
    query = query.where("status", "==", "active");

    // If filtering by partner, add partnerId filter
    if (partnerId) {
      console.log("[repo] getOrganizations - Filtering by partnerId:", partnerId);
      query = query.where("partnerId", "==", partnerId);
    }

    // Execute query (without orderBy to avoid composite index requirement)
    const snapshot = await query.get();
    console.log("[repo] getOrganizations - Query returned", snapshot.size, "documents");

    // Normalize and sort in memory
    const organizations = snapshot.docs.map((doc) => {
      try {
        return normalizeOrganization(doc.id, doc.data());
      } catch (error: any) {
        console.error("[repo] getOrganizations - Error normalizing doc", doc.id, error);
        throw error;
      }
    });

    // Sort in memory by name
    return organizations.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error: any) {
    console.error("[repo] getOrganizations - Error:", error);
    throw error;
  }
}

/**
 * Get organization by ID
 */
export async function getOrganization(organizationId: string): Promise<Organization | null> {
  try {
    const doc = await adminDb.collection(COLLECTION).doc(organizationId).get();
    if (!doc.exists) {
      return null;
    }
    return normalizeOrganization(doc.id, doc.data());
  } catch (error: any) {
    console.error("[repo] getOrganization - Error:", error);
    throw error;
  }
}

/**
 * Update organization
 */
export async function updateOrganization(
  organizationId: string,
  data: Partial<OrganizationInput>,
): Promise<void> {
  await adminDb.collection(COLLECTION).doc(organizationId).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Delete organization (with validation)
 */
export async function deleteOrganization(organizationId: string): Promise<void> {
  // Check if any teleoperators belong to this org
  const teleopSnapshot = await adminDb
    .collection("teleoperators")
    .where("organizationId", "==", organizationId)
    .limit(1)
    .get();

  if (!teleopSnapshot.empty) {
    throw new Error("Cannot delete organization with active teleoperators");
  }

  // Check if any locations assigned to this org
  const locationsSnapshot = await adminDb
    .collection("locations")
    .where("assignedOrganizationId", "==", organizationId)
    .limit(1)
    .get();

  if (!locationsSnapshot.empty) {
    throw new Error("Cannot delete organization with assigned locations");
  }

  await adminDb.collection(COLLECTION).doc(organizationId).delete();
}

/**
 * Normalize Firestore document to Organization type
 */
function normalizeOrganization(id: string, data: any): Organization {
  return {
    id,
    name: data.name || "",
    contactName: data.contactName,
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone,
    status: data.status || "active",
    partnerId: data.partnerId || "",
    createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
    createdBy: data.createdBy || "",
  };
}

