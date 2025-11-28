/**
 * AVAILABLE CLEANERS API
 * Returns field workers that can be assigned to a location
 * Filters by matching organizationId
 */

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Auth check
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    await adminAuth.verifyIdToken(token);

    // Get location
    const locationDoc = await adminDb
      .collection("locations")
      .doc(params.id)
      .get();
    if (!locationDoc.exists) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 },
      );
    }

    const locationData = locationDoc.data();
    
    // Support multiple organization assignments
    const assignedOrganizations = locationData?.assignedOrganizations || [];
    
    // Legacy support: if no assignedOrganizations, fall back to organizationId
    const legacyOrgId = locationData?.organizationId;
    const orgIds = assignedOrganizations.length > 0 
      ? assignedOrganizations 
      : (legacyOrgId ? [legacyOrgId] : []);

    if (orgIds.length === 0) {
      return NextResponse.json(
        { error: "Location has no organizations assigned" },
        { status: 400 },
      );
    }

    // Query for all field workers (both roles) assigned to any of the location's organizations
    // Note: Firestore 'in' operator supports up to 10 values
    const allCleaners: any[] = [];
    
    for (const orgId of orgIds.slice(0, 10)) { // Limit to 10 orgs per Firestore limit
      // Query for both worker roles with matching organizationId
      const [oemWorkers, locationWorkers] = await Promise.all([
        adminDb
          .collection("users")
          .where("role", "==", "oem_teleoperator")
          .where("organizationId", "==", orgId)
          .get(),
        adminDb
          .collection("users")
          .where("role", "==", "location_cleaner")
          .where("organizationId", "==", orgId)
          .get(),
      ]);

      allCleaners.push(...oemWorkers.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      allCleaners.push(...locationWorkers.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }

    // Remove duplicates by user ID
    const uniqueCleaners = Array.from(
      new Map(allCleaners.map(c => [c.id, c])).values()
    );

    const cleaners = uniqueCleaners.map((doc: any) => ({
      uid: doc.id,
      email: doc.email,
      displayName: doc.displayName || doc.email?.split("@")[0] || "Unknown",
      organizationId: doc.organizationId,
      role: doc.role,
    }));

    return NextResponse.json({
      success: true,
      cleaners,
      total: cleaners.length,
      assignedOrganizations: orgIds,
    });
  } catch (error: unknown) {
    console.error("[GET Available Cleaners] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch cleaners";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

