import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await getAdminAuth().verifyIdToken(token);
    
    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);

    const locationId = params.id;
    const body = await request.json();
    const { name, address } = body;

    if (!locationId) {
      return NextResponse.json({ error: 'Location ID required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const locationRef = adminDb.collection('locations').doc(locationId);
    const locationDoc = await locationRef.get();

    if (!locationDoc.exists) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (address !== undefined) {
      updateData.address = address.trim() || null;
    }

    await locationRef.update(updateData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] Location update error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update location' },
      { status: 500 }
    );
  }
}

