import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// Default holdings if document doesn't exist
const DEFAULT_HOLDINGS = {
  collectedVideos: 0,
  collectedHours: 0,
  collectedStorageGB: 0,
  deliveredVideos: 0,
  deliveredHours: 0,
  deliveredStorageGB: 0,
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
        collectedVideos: data.collectedVideos ?? DEFAULT_HOLDINGS.collectedVideos,
        collectedHours: data.collectedHours ?? DEFAULT_HOLDINGS.collectedHours,
        collectedStorageGB: data.collectedStorageGB ?? DEFAULT_HOLDINGS.collectedStorageGB,
        deliveredVideos: data.deliveredVideos ?? DEFAULT_HOLDINGS.deliveredVideos,
        deliveredHours: data.deliveredHours ?? DEFAULT_HOLDINGS.deliveredHours,
        deliveredStorageGB: data.deliveredStorageGB ?? DEFAULT_HOLDINGS.deliveredStorageGB,
      };
    }

    // Count videos from media collection (auto-update collectedVideos)
    try {
      const mediaCountSnapshot = await adminDb.collection('media').count().get();
      holdings.collectedVideos = mediaCountSnapshot.data().count;
    } catch (error) {
      console.error('[API] Error counting media:', error);
      // Fallback: if count() fails, use get() and count manually
      try {
        const mediaSnapshot = await adminDb.collection('media').get();
        holdings.collectedVideos = mediaSnapshot.size;
      } catch (fallbackError) {
        console.error('[API] Fallback media count failed:', fallbackError);
      }
    }

    // Fetch deliveries from dataDeliveries collection
    const deliveriesSnapshot = await adminDb.collection('dataDeliveries')
      .orderBy('date', 'desc')
      .get();
    
    const deliveries = deliveriesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        videoCount: data.videoCount || 0,
        sizeGB: data.sizeGB || 0,
        hours: data.hours !== undefined ? data.hours : null, // Include hours if present
        description: data.description || '',
        partnerId: data.partnerId || null,
        partnerName: data.partnerName || null,
        date: data.date?.toDate?.()?.toISOString() || data.date || new Date().toISOString(),
      };
    });

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
    if (holdings.collectedVideos !== undefined) {
      updateData.collectedVideos = holdings.collectedVideos;
    }
    if (holdings.collectedHours !== undefined) {
      updateData.collectedHours = holdings.collectedHours;
    }
    if (holdings.collectedStorageGB !== undefined) {
      updateData.collectedStorageGB = holdings.collectedStorageGB;
    }
    if (holdings.deliveredVideos !== undefined) {
      updateData.deliveredVideos = holdings.deliveredVideos;
    }
    if (holdings.deliveredHours !== undefined) {
      updateData.deliveredHours = holdings.deliveredHours;
    }
    if (holdings.deliveredStorageGB !== undefined) {
      updateData.deliveredStorageGB = holdings.deliveredStorageGB;
    }

    if (!settingsDoc.exists) {
      updateData.createdAt = FieldValue.serverTimestamp();
      // Set defaults for any missing fields
      updateData.collectedVideos = holdings.collectedVideos ?? DEFAULT_HOLDINGS.collectedVideos;
      updateData.collectedHours = holdings.collectedHours ?? DEFAULT_HOLDINGS.collectedHours;
      updateData.collectedStorageGB = holdings.collectedStorageGB ?? DEFAULT_HOLDINGS.collectedStorageGB;
      updateData.deliveredVideos = holdings.deliveredVideos ?? DEFAULT_HOLDINGS.deliveredVideos;
      updateData.deliveredHours = holdings.deliveredHours ?? DEFAULT_HOLDINGS.deliveredHours;
      updateData.deliveredStorageGB = holdings.deliveredStorageGB ?? DEFAULT_HOLDINGS.deliveredStorageGB;
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
