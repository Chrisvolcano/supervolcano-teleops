import { NextRequest, NextResponse } from "next/server";

import { adminAuth } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/apiAuth";

type PromotePayload = {
  email?: string;
  role?: string;
  partner_org_id?: string | null;
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

  const { email, role, partner_org_id } = payload;

  if (!email || !role) {
    return NextResponse.json(
      { error: "Missing required fields: email, role." },
      { status: 400 },
    );
  }

  try {
    const user = await adminAuth.getUserByEmail(email);
    await adminAuth.setCustomUserClaims(user.uid, {
      role,
      partner_org_id: partner_org_id ?? null,
    });
    return NextResponse.json(
      { success: true, uid: user.uid, role, partner_org_id: partner_org_id ?? null },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to promote user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

