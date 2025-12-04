import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

/**
 * Self-service endpoint for setting custom claims during onboarding
 * Only allows setting location_owner role for newly created users
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth token from request
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Verify the token and get user
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Check if user already has a role claim (prevent role escalation)
    if (decodedToken.role) {
      return NextResponse.json(
        { error: "User already has a role assigned" },
        { status: 403 }
      );
    }

    // Parse request body
    let payload: { role?: string; organizationId?: string };
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { role, organizationId } = payload;

    // Only allow location_owner role for self-service
    if (role !== "location_owner") {
      return NextResponse.json(
        { error: "Only location_owner role can be set via self-service" },
        { status: 403 }
      );
    }

    // Build custom claims
    const customClaims: Record<string, any> = {
      role: "location_owner",
    };

    // Set organizationId (use provided or default to owner:uid pattern)
    if (organizationId) {
      customClaims.organizationId = organizationId;
    } else {
      customClaims.organizationId = `owner:${uid}`;
    }

    // Set custom claims
    await adminAuth.setCustomUserClaims(uid, customClaims);

    return NextResponse.json(
      {
        success: true,
        uid,
        role: "location_owner",
        organizationId: customClaims.organizationId,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to set claims";
    console.error("[set-claims] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

