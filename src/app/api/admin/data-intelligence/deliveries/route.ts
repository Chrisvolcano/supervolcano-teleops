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
    const { date, deliveryDate: deliveryDateInput, videoCount, totalSizeGB, sizeGB, totalHours, hours, description, partnerId, partnerName, sourceFolders } = body;

    // Support both sizeGB and totalSizeGB, hours and totalHours
    const finalSizeGB = totalSizeGB !== undefined ? totalSizeGB : sizeGB;
    const finalHours = totalHours !== undefined ? totalHours : hours;

    if (typeof videoCount !== 'number' || typeof finalSizeGB !== 'number') {
      return NextResponse.json({ error: 'Invalid videoCount or sizeGB' }, { status: 400 });
    }

    if (!description || typeof description !== 'string' || description.trim() === '') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    
    // Get partner name if not provided
    let finalPartnerName = partnerName;
    if (partnerId && !finalPartnerName) {
      try {
        const partnerDoc = await adminDb.collection('organizations').doc(partnerId).get();
        if (partnerDoc.exists) {
          finalPartnerName = partnerDoc.data()?.name || null;
        }
      } catch (err) {
        console.error('Failed to fetch partner name:', err);
      }
    }
    
    // Parse date - use deliveryDate or date field, or default to today
    let deliveryDate: Timestamp;
    const dateInput = deliveryDateInput || date;
    if (dateInput && typeof dateInput === 'string') {
      const parsedDate = new Date(dateInput);
      if (isNaN(parsedDate.getTime())) {
        deliveryDate = Timestamp.now(); // Fallback to now if invalid
      } else {
        deliveryDate = Timestamp.fromDate(parsedDate);
      }
    } else {
      deliveryDate = Timestamp.now();
    }

    // Calculate hours if not provided
    const deliveryHours = finalHours !== undefined && finalHours !== null 
      ? parseFloat(finalHours.toString())
      : finalSizeGB / 15; // Auto-calculate from sizeGB

    // Get user ID from token
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    // Add delivery entry to dataDeliveries collection
    const deliveryRef = adminDb.collection('dataDeliveries').doc();
    await deliveryRef.set({
      videoCount,
      sizeGB: finalSizeGB,
      hours: deliveryHours,
      description: description.trim(),
      partnerId: partnerId || null,
      partnerName: finalPartnerName || null,
      date: deliveryDate, // Use provided date as Timestamp
      sourceFolders: sourceFolders || [], // Array of folder references
      createdAt: FieldValue.serverTimestamp(),
      createdBy: userId,
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
