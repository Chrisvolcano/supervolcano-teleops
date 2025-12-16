import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);

    const organizationId = decodeURIComponent(params.id);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const deliveryId = searchParams.get('deliveryId'); // Optional: get videos for specific delivery

    const db = getAdminDb();

    let videoIds: string[] = [];

    if (deliveryId) {
      // Get videos for a specific delivery
      const deliveryDoc = await db.collection('trainingExports').doc(deliveryId).get();
      if (deliveryDoc.exists) {
        const data = deliveryDoc.data();
        videoIds = data?.videoIds || [];
      }
    } else {
      // Get videos from recent deliveries/exports for this partner
      const exportsSnapshot = await db
        .collection('trainingExports')
        .where('partnerId', '==', organizationId)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

      // Collect video IDs from recent exports
      exportsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const ids = data.videoIds || [];
        videoIds.push(...ids);
      });

      // Deduplicate
      videoIds = [...new Set(videoIds)];
    }

    if (videoIds.length === 0) {
      return NextResponse.json({ videos: [], source: 'deliveries' });
    }

    // Limit the number of videos to fetch
    const idsToFetch = videoIds.slice(0, limit);

    // Fetch video documents
    const videos: any[] = [];
    
    // Firestore getAll is more efficient for multiple docs
    const videoRefs = idsToFetch.map(id => db.collection('media').doc(id));
    const videoDocs = await db.getAll(...videoRefs);
    
    videoDocs.forEach(doc => {
      if (doc.exists) {
        const data = doc.data();
        videos.push({
          id: doc.id,
          url: data?.url || data?.videoUrl || data?.storageUrl,
          fileName: data?.fileName,
          durationSeconds: data?.durationSeconds,
          locationId: data?.locationId,
          locationName: data?.locationName,
          roomType: data?.roomType,
          uploadedAt: data?.uploadedAt?.toDate?.()?.toISOString() || null,
        });
      }
    });

    return NextResponse.json({ 
      videos, 
      source: 'deliveries',
      totalAvailable: videoIds.length,
    });
  } catch (error: any) {
    console.error('[API] Get organization videos error:', error);
    
    // Check if it's an index error
    if (error.message?.includes('index')) {
      return NextResponse.json({ 
        videos: [], 
        source: 'deliveries',
        indexRequired: true,
        error: 'Firestore index required. Check console for link.',
      });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to get videos' },
      { status: 500 }
    );
  }
}
