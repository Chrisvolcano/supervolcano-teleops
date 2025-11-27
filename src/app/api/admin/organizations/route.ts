/**
 * ORGANIZATIONS API
 * Manages organization CRUD operations
 */

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { generateOrganizationId } from "@/types/organization.types";
import type {
  Organization,
  OrganizationType,
  CreateOrganizationRequest,
} from "@/types/organization.types";

// GET /api/admin/organizations - List all organizations or filter by type
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get("x-firebase-token");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(authHeader);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can view organizations
    if (
      decodedToken.role !== "admin" &&
      decodedToken.role !== "superadmin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get filter from query params
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get("type") as OrganizationType | null;

    // Fetch all organizations (client-side filter until index builds)
    const query: FirebaseFirestore.Query = adminDb
      .collection("organizations")
      .orderBy("name", "asc");

    const snapshot = await query.get();

    let organizations: Organization[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        type: data.type as OrganizationType,
        slug: data.slug,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        billingStatus: data.billingStatus,
        metadata: data.metadata,
        created_at: data.created_at?.toDate?.() || new Date(data.created_at),
        updated_at: data.updated_at?.toDate?.() || new Date(data.updated_at),
      } as Organization;
    });

    // Client-side filter by type if specified
    if (typeFilter) {
      organizations = organizations.filter((org) => org.type === typeFilter);
    }

    return NextResponse.json({
      success: true,
      organizations,
      total: organizations.length,
    });
  } catch (error: unknown) {
    console.error("[GET Organizations] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch organizations";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

// POST /api/admin/organizations - Create new organization
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get("x-firebase-token");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(authHeader);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can create organizations
    if (
      decodedToken.role !== "admin" &&
      decodedToken.role !== "superadmin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: CreateOrganizationRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.type || !body.slug) {
      return NextResponse.json(
        { error: "Name, type, and slug are required" },
        { status: 400 },
      );
    }

    // Validate slug format (lowercase alphanumeric + hyphens)
    const slugRegex = /^[a-z0-9-]{2,50}$/;
    if (!slugRegex.test(body.slug)) {
      return NextResponse.json(
        {
          error:
            "Slug must be lowercase alphanumeric with hyphens, 2-50 characters",
        },
        { status: 400 },
      );
    }

    // Generate prefixed ID
    const organizationId = generateOrganizationId(body.type, body.slug);

    // Check if already exists
    const existing = await adminDb
      .collection("organizations")
      .doc(organizationId)
      .get();
    if (existing.exists) {
      return NextResponse.json(
        { error: "Organization with this slug already exists" },
        { status: 409 },
      );
    }

    // Create organization
    const organization: Omit<Organization, "id"> = {
      name: body.name,
      type: body.type,
      slug: body.slug,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await adminDb.collection("organizations").doc(organizationId).set(organization);

    // Audit log
    try {
      await adminDb.collection("audit_logs").add({
        entityId: organizationId,
        entityType: "organization",
        action: "organization_create",
        actorId: decodedToken.uid || decodedToken.email || "system",
        createdAt: new Date(),
        details: { name: body.name, type: body.type },
      });
    } catch (auditError) {
      // Don't fail the request if audit logging fails
      console.error("Failed to log audit entry:", auditError);
    }

    return NextResponse.json({
      success: true,
      organization: {
        id: organizationId,
        ...organization,
      },
    });
  } catch (error: unknown) {
    console.error("[POST Organizations] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create organization";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

