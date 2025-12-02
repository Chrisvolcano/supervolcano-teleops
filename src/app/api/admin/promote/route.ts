import { NextRequest, NextResponse } from "next/server";

import { adminAuth } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/apiAuth";

type PromotePayload = {
  email?: string;
  role?: string;
  partner_org_id?: string | null;
  organizationId?: string | null;
  teleoperatorId?: string | null;
};

export async function POST(request: NextRequest) {
  const authorized = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: PromotePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const { email, role, partner_org_id, organizationId, teleoperatorId } = payload;

  if (!email || !role) {
    return NextResponse.json(
      { error: "Missing required fields: email, role." },
      { status: 400 },
    );
  }

  // Validate organization-based roles
  if ((role === "org_manager" || role === "oem_teleoperator") && !organizationId) {
    return NextResponse.json(
      { error: `Missing required field: organizationId (required for ${role} role)` },
      { status: 400 },
    );
  }

  try {
    const user = await adminAuth.getUserByEmail(email);
    
    // Build custom claims
    const customClaims: Record<string, any> = {
      role,
    };

    if (partner_org_id) {
      customClaims.partnerId = partner_org_id;
    }

    if (organizationId) {
      customClaims.organizationId = organizationId;
    }

    if (teleoperatorId) {
      customClaims.teleoperatorId = teleoperatorId;
    }

    await adminAuth.setCustomUserClaims(user.uid, customClaims);
    
    return NextResponse.json(
      { 
        success: true, 
        uid: user.uid, 
        role, 
        partnerId: partner_org_id ?? null,
        organizationId: organizationId ?? null,
        teleoperatorId: teleoperatorId ?? null,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to promote user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

