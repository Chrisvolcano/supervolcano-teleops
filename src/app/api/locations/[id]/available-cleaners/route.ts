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
    const locationOrgId = locationData?.organizationId;

    if (!locationOrgId) {
      return NextResponse.json(
        { error: "Location has no organization assigned" },
        { status: 400 },
      );
    }

    // Determine which worker role to query based on org type
    const [orgPrefix] = locationOrgId.split(":");
    const workerRole =
      orgPrefix === "oem" ? "oem_teleoperator" : "property_cleaner";

    // Get all field workers with matching organizationId
    const usersSnapshot = await adminDb
      .collection("users")
      .where("role", "==", workerRole)
      .where("organizationId", "==", locationOrgId)
      .get();

    const cleaners = usersSnapshot.docs.map((doc) => ({
      uid: doc.id,
      email: doc.data().email,
      displayName:
        doc.data().displayName || doc.data().email.split("@")[0],
      organizationId: doc.data().organizationId,
    }));

    return NextResponse.json({
      success: true,
      cleaners,
      total: cleaners.length,
      locationOrganizationId: locationOrgId,
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

