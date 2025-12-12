import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

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
    const { date, videoCount, sizeGB, hours, description, partnerId, partnerName } = body;

    if (typeof videoCount !== 'number' || typeof sizeGB !== 'number') {
      return NextResponse.json({ error: 'Invalid videoCount or sizeGB' }, { status: 400 });
    }

    if (!description || typeof description !== 'string' || description.trim() === '') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    
    // Parse date - use provided date or default to today
    let deliveryDate: Timestamp;
    if (date && typeof date === 'string') {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        deliveryDate = Timestamp.now(); // Fallback to now if invalid
      } else {
        deliveryDate = Timestamp.fromDate(parsedDate);
      }
    } else {
      deliveryDate = Timestamp.now();
    }

    // Calculate hours if not provided
    const deliveryHours = hours !== undefined && hours !== null 
      ? parseFloat(hours.toString())
      : sizeGB / 15; // Auto-calculate from sizeGB

    // Add delivery entry to dataDeliveries collection
    const deliveryRef = adminDb.collection('dataDeliveries').doc();
    await deliveryRef.set({
      videoCount,
      sizeGB,
      hours: deliveryHours,
      description: description.trim(),
      partnerId: partnerId || null,
      partnerName: partnerName || null,
      date: deliveryDate, // Use provided date as Timestamp
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
