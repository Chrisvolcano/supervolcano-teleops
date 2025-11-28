/**
 * ORGANIZATION DETAIL API
 * GET, PATCH, DELETE for individual organizations
 */
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

// GET /api/admin/organizations/[id] - Get single organization
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("x-firebase-token");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(authHeader);
    if (decodedToken.role !== "admin" && decodedToken.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orgId = decodeURIComponent(params.id);
    const doc = await adminDb.collection("organizations").doc(orgId).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const data = doc.data()!;

    return NextResponse.json({
      success: true,
      organization: {
        id: doc.id,
        name: data.name,
        type: data.type,
        slug: data.slug,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        created_at: data.created_at?.toDate?.() || data.created_at,
        updated_at: data.updated_at?.toDate?.() || data.updated_at,
      },
    });
  } catch (error: unknown) {
    console.error("[GET Organization] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch organization";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/admin/organizations/[id] - Update organization
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("x-firebase-token");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(authHeader);
    if (decodedToken.role !== "admin" && decodedToken.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orgId = decodeURIComponent(params.id);
    const body = await request.json();

    // Validate org exists
    const doc = await adminDb.collection("organizations").doc(orgId).get();
    if (!doc.exists) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Build update object - only allow certain fields
    const allowedFields = ["name", "contactEmail", "contactPhone"];
    const updates: Record<string, unknown> = {
      updated_at: new Date(),
    };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Validate name if provided
    if (updates.name && typeof updates.name === "string") {
      if (updates.name.trim().length < 2) {
        return NextResponse.json(
          { error: "Name must be at least 2 characters" },
          { status: 400 }
        );
      }
      updates.name = updates.name.trim();
    }

    await adminDb.collection("organizations").doc(orgId).update(updates);

    // Audit log
    try {
      await adminDb.collection("audit_logs").add({
        entityId: orgId,
        entityType: "organization",
        action: "organization_update",
        actorId: decodedToken.uid || decodedToken.email || "system",
        createdAt: new Date(),
        details: { updates },
      });
    } catch (auditError) {
      console.error("Failed to log audit entry:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: "Organization updated",
    });
  } catch (error: unknown) {
    console.error("[PATCH Organization] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to update organization";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/admin/organizations/[id] - Delete organization
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("x-firebase-token");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(authHeader);
    if (decodedToken.role !== "admin" && decodedToken.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orgId = decodeURIComponent(params.id);

    // Prevent deleting SuperVolcano internal
    if (orgId === "sv:internal") {
      return NextResponse.json(
        { error: "Cannot delete SuperVolcano internal organization" },
        { status: 400 }
      );
    }

    // Check if org has users
    const usersSnapshot = await adminDb
      .collection("users")
      .where("organizationId", "==", orgId)
      .limit(1)
      .get();

    if (!usersSnapshot.empty) {
      return NextResponse.json(
        { error: "Cannot delete organization with active users. Reassign users first." },
        { status: 400 }
      );
    }

    // Delete the organization
    await adminDb.collection("organizations").doc(orgId).delete();

    // Audit log
    try {
      await adminDb.collection("audit_logs").add({
        entityId: orgId,
        entityType: "organization",
        action: "organization_delete",
        actorId: decodedToken.uid || decodedToken.email || "system",
        createdAt: new Date(),
        details: {},
      });
    } catch (auditError) {
      console.error("Failed to log audit entry:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: "Organization deleted",
    });
  } catch (error: unknown) {
    console.error("[DELETE Organization] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete organization";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

