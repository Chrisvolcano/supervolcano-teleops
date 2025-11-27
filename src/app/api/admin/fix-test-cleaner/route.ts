/**
 * ATOMIC FIX: Test Cleaner
 * One-time use endpoint - DELETE AFTER EXECUTION
 * GET /api/admin/fix-test-cleaner
 */

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/apiAuth";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const authorized = await requireAdmin(request);
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find test cleaner by email
    const usersQuery = await adminDb
      .collection("users")
      .where("email", "==", "testcleaner@supervolcano.com")
      .limit(1)
      .get();

    if (usersQuery.empty) {
      return NextResponse.json(
        {
          success: false,
          error: "Test cleaner not found in Firestore",
        },
        { status: 404 },
      );
    }

    const userDoc = usersQuery.docs[0];
    const uid = userDoc.id;

    // Fix Auth custom claims
    await adminAuth.setCustomUserClaims(uid, {
      role: "field_operator",
      organizationId: "94c8ed66-46ed-49dd-8d02-c053f2c38cb9",
    });

    // Fix Firestore document
    await adminDb.collection("users").doc(uid).update({
      role: "field_operator",
      organizationId: "94c8ed66-46ed-49dd-8d02-c053f2c38cb9",
      displayName: "Test Cleaner",
      updated_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Test cleaner fixed successfully",
      uid,
    });
  } catch (error: unknown) {
    console.error("[Fix Test Cleaner] Error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

