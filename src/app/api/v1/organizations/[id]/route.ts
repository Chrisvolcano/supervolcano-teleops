/**
 * API Route: Organization Detail
 * GET: Get organization by ID
 * PATCH: Update an organization
 * DELETE: Delete an organization
 */

import { NextRequest, NextResponse } from "next/server";
import { getOrganization, updateOrganization, deleteOrganization } from "@/lib/repositories/organizations";
import { getUserClaims, requireRole } from "@/lib/utils/auth";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const organizationId = params.id;
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    requireRole(claims, ["superadmin", "partner_admin"]);

    const organization = await getOrganization(organizationId);
    
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({ organization });
  } catch (error: any) {
    console.error("[api] GET /api/v1/organizations/[id] - Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch organization" },
      { status: error.statusCode || 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const organizationId = params.id;
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    requireRole(claims, ["superadmin", "partner_admin"]);

    const body = await request.json();
    const { name, contactName, contactEmail, contactPhone, status } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }

    await updateOrganization(organizationId, {
      name: name.trim(),
      contactName: contactName?.trim(),
      contactEmail: contactEmail?.trim(),
      contactPhone: contactPhone?.trim(),
      status: status || "active",
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[api] PATCH /api/v1/organizations/[id] - Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update organization" },
      { status: error.statusCode || 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const organizationId = params.id;
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    requireRole(claims, ["superadmin", "partner_admin"]);

    await deleteOrganization(organizationId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[api] DELETE /api/v1/organizations/[id] - Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete organization" },
      { status: error.statusCode || 500 },
    );
  }
}

