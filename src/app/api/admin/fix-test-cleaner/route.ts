/**
 * ONE-TIME FIX: Test Cleaner
 * DELETE THIS FILE AFTER USE
 */

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    console.log("[Fix Test Cleaner] Starting fix...");

    // Find test cleaner by email
    const usersQuery = await adminDb
      .collection("users")
      .where("email", "==", "testcleaner@supervolcano.com")
      .limit(1)
      .get();

    if (usersQuery.empty) {
      console.log("[Fix Test Cleaner] User not found");
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
    console.log("[Fix Test Cleaner] Found user:", uid);

    // Fix Auth custom claims
    await adminAuth.setCustomUserClaims(uid, {
      role: "field_operator",
      organizationId: "94c8ed66-46ed-49dd-8d02-c053f2c38cb9",
    });
    console.log("[Fix Test Cleaner] Auth claims updated");

    // Fix Firestore document
    await adminDb.collection("users").doc(uid).update({
      role: "field_operator",
      organizationId: "94c8ed66-46ed-49dd-8d02-c053f2c38cb9",
      displayName: "Test Cleaner",
      updated_at: new Date(),
    });
    console.log("[Fix Test Cleaner] Firestore updated");

    return NextResponse.json({
      success: true,
      message: "Test cleaner fixed successfully",
      uid,
      details: {
        role: "field_operator",
        organizationId: "94c8ed66-46ed-49dd-8d02-c053f2c38cb9",
      },
    });
  } catch (error: unknown) {
    console.error("[Fix Test Cleaner] Error:", error);
    const err = error instanceof Error ? error : new Error("Unknown error");
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 },
    );
  }
}
