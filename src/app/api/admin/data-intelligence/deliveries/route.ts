import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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
    
    requireRole(claims, ['superadmin', 'admin']);

    const body = await request.json();
    const { videoCount, sizeGB, description, partnerId, partnerName } = body;

    if (typeof videoCount !== 'number' || typeof sizeGB !== 'number') {
      return NextResponse.json({ error: 'Invalid videoCount or sizeGB' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    
    // Add delivery entry to dataDeliveries collection
    const deliveryRef = adminDb.collection('dataDeliveries').doc();
    await deliveryRef.set({
      videoCount,
      sizeGB,
      description: description || '',
      partnerId: partnerId || null,
      partnerName: partnerName || null,
      date: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });

    // Increment videosDelivered in settings/dataIntelligence
    const settingsRef = adminDb.collection('settings').doc('dataIntelligence');
    await settingsRef.set({
      videosDelivered: FieldValue.increment(videoCount),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({
      success: true,
      id: deliveryRef.id,
    });
  } catch (error: any) {
    console.error('[API] Add delivery error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add delivery' },
      { status: 500 }
    );
  }
}
