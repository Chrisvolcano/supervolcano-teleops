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
      .orderBy('createdAt', 'desc')
      .get();
    
    const deliveries = deliveriesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        partnerId: data.partnerId || null,
        partnerName: data.partnerName || null,
        date: data.date?.toDate?.()?.toISOString() || data.createdAt?.toDate?.()?.toISOString() || null,
        videoCount: data.videoCount || 0,
        sizeGB: data.sizeGB || (data.totalSizeBytes || 0) / (1024 * 1024 * 1024),
        hours: data.hours || (data.totalDurationSeconds || 0) / 3600,
        status: data.status || 'completed',
        description: data.description || data.notes || '',
        notes: data.notes || null,
      };
    });

    // Fetch data sources from dataSources collection
    const sourcesSnapshot = await adminDb.collection('dataSources').get();
    const sources = sourcesSnapshot.docs.map(doc => {
      const data = doc.data();
      const useDisplay = data.useDisplayValues === true;

      return {
        id: doc.id,
        name: data.name || doc.id,
        type: data.type || 'unknown',
        folderId: data.folderId || null,
        parentChain: data.parentChain || null,

        // Actual values (always include for reference)
        actual: {
          videoCount: data.videoCount || 0,
          totalHours: data.totalHours || 0,
          totalMinutes: data.totalMinutes || 0,
          totalSizeGB: data.totalSizeGB || 0,
          durationSource: data.durationSource || 'estimated',
          filesWithDuration: data.filesWithDuration || 0,
        },

        // Display values (for demo mode)
        display: {
          videoCount: data.displayVideos ?? data.videoCount ?? 0,
          totalHours: data.displayHours ?? data.totalHours ?? 0,
          totalSizeGB: data.displayStorageGB ?? data.totalSizeGB ?? 0,
        },

        // Which mode to use
        useDisplayValues: useDisplay,

        // Current values based on mode
        videoCount: useDisplay ? (data.displayVideos ?? data.videoCount ?? 0) : (data.videoCount ?? 0),
        totalHours: useDisplay ? (data.displayHours ?? data.totalHours ?? 0) : (data.totalHours ?? 0),
        totalSizeGB: useDisplay ? (data.displayStorageGB ?? data.totalSizeGB ?? 0) : (data.totalSizeGB ?? 0),

        lastSync: data.lastSync?.toDate?.()?.toISOString() || null,
      };
    });

    // Determine which sources are "root" (not children of other sources)
    const allFolderIds = new Set(sources.map(s => s.folderId).filter(Boolean));

    const sourcesWithRootFlag = sources.map(source => {
      // A source is a root if none of its parents are in our data sources
      const isRoot = !source.parentChain?.some((parentId: string) => allFolderIds.has(parentId));
      return { ...source, isRoot };
    });

    // Calculate deduplicated totals (only count root sources)
    const rootSources = sourcesWithRootFlag.filter(s => s.isRoot);
    const deduplicatedTotals = {
      totalVideos: rootSources.reduce((sum, s) => {
        const sourceData = s.useDisplayValues ? s.display : s.actual;
        return sum + (sourceData.videoCount || 0);
      }, 0),
      totalHours: rootSources.reduce((sum, s) => {
        const sourceData = s.useDisplayValues ? s.display : s.actual;
        return sum + (sourceData.totalHours || 0);
      }, 0),
      totalSizeGB: rootSources.reduce((sum, s) => {
        const sourceData = s.useDisplayValues ? s.display : s.actual;
        return sum + (sourceData.totalSizeGB || 0);
      }, 0),
    };

    // Calculate raw totals (all sources, including duplicates)
    const rawTotals = {
      totalVideos: sources.reduce((sum, s) => {
        const sourceData = s.useDisplayValues ? s.display : s.actual;
        return sum + (sourceData.videoCount || 0);
      }, 0),
      totalHours: sources.reduce((sum, s) => {
        const sourceData = s.useDisplayValues ? s.display : s.actual;
        return sum + (sourceData.totalHours || 0);
      }, 0),
      totalSizeGB: sources.reduce((sum, s) => {
        const sourceData = s.useDisplayValues ? s.display : s.actual;
        return sum + (sourceData.totalSizeGB || 0);
      }, 0),
    };

    // If no sources exist, add default Portal Uploads
    if (sources.length === 0) {
      sources.push({
        id: 'portal-uploads',
        name: 'Portal Uploads',
        type: 'portal',
        folderId: null,
        actual: {
          videoCount: 0,
          totalHours: 0,
          totalMinutes: 0,
          totalSizeGB: 0,
          durationSource: 'estimated',
          filesWithDuration: 0,
        },
        display: {
          videoCount: 0,
          totalHours: 0,
          totalSizeGB: 0,
        },
        useDisplayValues: false,
        videoCount: 0,
        totalHours: 0,
        totalSizeGB: 0,
        lastSync: null,
      });
    }

    return NextResponse.json({
      holdings,
      deliveries,
      sources: sourcesWithRootFlag,
      deduplicatedTotals,
      rawTotals,
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
    const { holdings, sourceId, displayVideos, displayHours, displayStorageGB, useDisplayValues } = body;

    const adminDb = getAdminDb();

    // Handle display values update for data sources
    if (sourceId) {
      if (!sourceId) {
        return NextResponse.json({ error: 'sourceId required' }, { status: 400 });
      }

      const updateData: Record<string, any> = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      // Only update fields that are provided
      if (displayVideos !== undefined) updateData.displayVideos = displayVideos;
      if (displayHours !== undefined) updateData.displayHours = displayHours;
      if (displayStorageGB !== undefined) updateData.displayStorageGB = displayStorageGB;
      if (useDisplayValues !== undefined) updateData.useDisplayValues = useDisplayValues;

      await adminDb.collection('dataSources').doc(sourceId).update(updateData);

      return NextResponse.json({ success: true });
    }

    // Handle holdings update (existing functionality)
    if (!holdings || typeof holdings !== 'object') {
      return NextResponse.json({ error: 'Invalid holdings data' }, { status: 400 });
    }

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
