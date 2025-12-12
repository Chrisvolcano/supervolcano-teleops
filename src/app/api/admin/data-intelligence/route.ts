import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// Default holdings if document doesn't exist
const DEFAULT_HOLDINGS = {
  videosCollected: 0,
  videosDelivered: 0,
  hoursFootage: 0,
  totalStorageTB: 0,
};

export async function GET(request: NextRequest) {
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

    const adminDb = getAdminDb();
    
    // Read settings/dataIntelligence doc for holdings
    const settingsRef = adminDb.collection('settings').doc('dataIntelligence');
    const settingsDoc = await settingsRef.get();

    let holdings = DEFAULT_HOLDINGS;
    if (settingsDoc.exists) {
      const data = settingsDoc.data() || {};
      holdings = {
        videosCollected: data.videosCollected ?? DEFAULT_HOLDINGS.videosCollected,
        videosDelivered: data.videosDelivered ?? DEFAULT_HOLDINGS.videosDelivered,
        hoursFootage: data.hoursFootage ?? DEFAULT_HOLDINGS.hoursFootage,
        totalStorageTB: data.totalStorageTB ?? DEFAULT_HOLDINGS.totalStorageTB,
      };
    }

    // Count videos from media collection
    try {
      const mediaCountSnapshot = await adminDb.collection('media').count().get();
      holdings.videosCollected = mediaCountSnapshot.data().count;
    } catch (error) {
      console.error('[API] Error counting media:', error);
      // Fallback: if count() fails, use get() and count manually
      try {
        const mediaSnapshot = await adminDb.collection('media').get();
        holdings.videosCollected = mediaSnapshot.size;
      } catch (fallbackError) {
        console.error('[API] Fallback media count failed:', fallbackError);
      }
    }

    // Fetch deliveries from dataDeliveries collection
    const deliveriesSnapshot = await adminDb.collection('dataDeliveries')
      .orderBy('date', 'desc')
      .get();
    
    const deliveries = deliveriesSnapshot.docs.map(doc => ({
      id: doc.id,
      videoCount: doc.data().videoCount || 0,
      sizeGB: doc.data().sizeGB || 0,
      description: doc.data().description || '',
      date: doc.data().date?.toDate?.()?.toISOString() || doc.data().date || new Date().toISOString(),
    }));

    // Fetch data sources from dataSources collection
    const sourcesSnapshot = await adminDb.collection('dataSources').get();
    const sources = sourcesSnapshot.docs.map(doc => ({
      name: doc.data().name || doc.id,
      videoCount: doc.data().videoCount || 0,
      hours: doc.data().hours || 0,
    }));

    // If no sources exist, add default Portal Uploads
    if (sources.length === 0) {
      sources.push({ name: 'Portal Uploads', videoCount: 0, hours: 0 });
    }

    return NextResponse.json({
      holdings,
      deliveries,
      sources,
    });
  } catch (error: any) {
    console.error('[API] Data intelligence GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch data intelligence' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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
    const { holdings } = body;

    if (!holdings || typeof holdings !== 'object') {
      return NextResponse.json({ error: 'Invalid holdings data' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const settingsRef = adminDb.collection('settings').doc('dataIntelligence');
    const settingsDoc = await settingsRef.get();

    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Update only the provided fields
    if (holdings.videosCollected !== undefined) {
      updateData.videosCollected = holdings.videosCollected;
    }
    if (holdings.videosDelivered !== undefined) {
      updateData.videosDelivered = holdings.videosDelivered;
    }
    if (holdings.hoursFootage !== undefined) {
      updateData.hoursFootage = holdings.hoursFootage;
    }
    if (holdings.totalStorageTB !== undefined) {
      updateData.totalStorageTB = holdings.totalStorageTB;
    }

    if (!settingsDoc.exists) {
      updateData.createdAt = FieldValue.serverTimestamp();
      // Set defaults for any missing fields
      updateData.videosCollected = holdings.videosCollected ?? DEFAULT_HOLDINGS.videosCollected;
      updateData.videosDelivered = holdings.videosDelivered ?? DEFAULT_HOLDINGS.videosDelivered;
      updateData.hoursFootage = holdings.hoursFootage ?? DEFAULT_HOLDINGS.hoursFootage;
      updateData.totalStorageTB = holdings.totalStorageTB ?? DEFAULT_HOLDINGS.totalStorageTB;
    }

    await settingsRef.set(updateData, { merge: true });

    return NextResponse.json({ success: true, holdings: updateData });
  } catch (error: any) {
    console.error('[API] Data intelligence PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update data intelligence' },
      { status: 500 }
    );
  }
}
