/**
 * USER MANAGEMENT API - SYNC USER
 * POST - Sync user data between Auth and Firestore
 */

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/apiAuth";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authorized = await requireAdmin(request);
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId } = params;
    const body = await request.json();
    const { direction } = body; // "toAuth" | "toFirestore" | "both"

    if (!direction || !["toAuth", "toFirestore", "both"].includes(direction)) {
      return NextResponse.json(
        { error: "Invalid direction. Must be 'toAuth', 'toFirestore', or 'both'" },
        { status: 400 },
      );
    }

    // Get current data from both sources
    const authUser = await adminAuth.getUser(userId);
    const authClaims = authUser.customClaims || {};

    const firestoreDoc = await adminDb.collection("users").doc(userId).get();
    const firestoreData = firestoreDoc.exists
      ? (firestoreDoc.data() as Record<string, unknown>)
      : null;

    if (direction === "toAuth" || direction === "both") {
      // Sync Firestore → Auth
      if (firestoreData) {
        const customClaims: Record<string, unknown> = {};
        if (firestoreData.role !== undefined)
          customClaims.role = firestoreData.role;
        if (firestoreData.organizationId !== undefined)
          customClaims.organizationId = firestoreData.organizationId;
        if (firestoreData.teleoperatorId !== undefined)
          customClaims.teleoperatorId = firestoreData.teleoperatorId;

        await adminAuth.setCustomUserClaims(userId, customClaims);

        // Update display name if different
        if (
          firestoreData.displayName &&
          firestoreData.displayName !== authUser.displayName
        ) {
          await adminAuth.updateUser(userId, {
            displayName: firestoreData.displayName as string,
          });
        }

        console.log("Synced Firestore → Auth:", customClaims);
      }
    }

    if (direction === "toFirestore" || direction === "both") {
      // Sync Auth → Firestore
      const firestoreUpdates: Record<string, unknown> = {};
      if (authClaims.role !== undefined) firestoreUpdates.role = authClaims.role;
      if (authClaims.organizationId !== undefined)
        firestoreUpdates.organizationId = authClaims.organizationId;
      if (authClaims.teleoperatorId !== undefined)
        firestoreUpdates.teleoperatorId = authClaims.teleoperatorId;
      if (authUser.displayName !== undefined)
        firestoreUpdates.displayName = authUser.displayName;
      firestoreUpdates.updated_at = new Date();

      if (firestoreDoc.exists) {
        await adminDb.collection("users").doc(userId).update(firestoreUpdates);
      } else {
        // Create if doesn't exist
        await adminDb.collection("users").doc(userId).set({
          email: authUser.email || "",
          ...firestoreUpdates,
          created_at: new Date(),
        });
      }

      console.log("Synced Auth → Firestore:", firestoreUpdates);
    }

    return NextResponse.json({
      success: true,
      message: `User synced ${direction}`,
    });
  } catch (error: unknown) {
    console.error("Failed to sync user:", error);
    const message =
      error instanceof Error ? error.message : "Failed to sync user";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

