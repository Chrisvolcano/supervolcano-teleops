import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function DELETE(
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
    
    requireRole(claims, ['superadmin', 'admin']);

    const deliveryId = params.id;
    if (!deliveryId) {
      return NextResponse.json({ error: 'Delivery ID required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const deliveryRef = adminDb.collection('dataDeliveries').doc(deliveryId);
    
    const deliveryDoc = await deliveryRef.get();
    if (!deliveryDoc.exists) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    const deliveryData = deliveryDoc.data();
    const videoCount = deliveryData?.videoCount || 0;

    // Delete the delivery
    await deliveryRef.delete();

    // Decrement videosDelivered in settings/dataIntelligence
    const settingsRef = adminDb.collection('settings').doc('dataIntelligence');
    await settingsRef.set({
      videosDelivered: FieldValue.increment(-videoCount),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] Delete delivery error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete delivery' },
      { status: 500 }
    );
  }
}
