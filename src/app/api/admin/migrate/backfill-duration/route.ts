import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for processing

// POST /api/admin/migrate/backfill-duration
// Backfills durationSeconds for videos that don't have it
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    requireRole(claims, ['superadmin', 'admin']);

    const db = getAdminDb();
    const { batchSize = 20 } = await request.json().catch(() => ({}));

    // Find videos without durationSeconds
    // Fetch more documents and filter client-side since we can't query by mimeType easily
    const snapshot = await db.collection('media')
      .limit(200)
      .get();

    const videosNeedingDuration = snapshot.docs.filter(doc => {
      const data = doc.data();
      const isVideo = data.mimeType?.startsWith('video/') || 
                      data.type === 'video' || 
                      data.fileName?.match(/\.(mp4|mov|webm|avi|mkv)$/i);
      const hasDuration = data.durationSeconds || data.duration;
      const hasUrl = data.url || data.videoUrl || data.storageUrl;
      return isVideo && !hasDuration && hasUrl;
    }).slice(0, batchSize);

    if (videosNeedingDuration.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No videos need duration backfill',
        processed: 0,
        total: snapshot.docs.length,
      });
    }

    // Return video IDs and URLs for client-side processing
    // (Server can't easily extract duration without FFmpeg)
    const videosToProcess = videosNeedingDuration.map(doc => ({
      id: doc.id,
      url: doc.data().url || doc.data().videoUrl || doc.data().storageUrl,
      fileName: doc.data().fileName,
    }));

    return NextResponse.json({
      success: true,
      videos: videosToProcess,
      count: videosToProcess.length,
      message: `Found ${videosToProcess.length} videos needing duration`,
    });
  } catch (error: any) {
    console.error('[API] Backfill duration error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to backfill duration' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/migrate/backfill-duration
// Updates a single video's duration
export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    requireRole(claims, ['superadmin', 'admin']);

    const { videoId, durationSeconds } = await request.json();
    
    if (!videoId || typeof durationSeconds !== 'number') {
      return NextResponse.json({ error: 'Missing videoId or durationSeconds' }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection('media').doc(videoId).update({
      durationSeconds,
      duration: durationSeconds, // Also set duration for compatibility
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, videoId, durationSeconds });
  } catch (error: any) {
    console.error('[API] Update duration error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update duration' },
      { status: 500 }
    );
  }
}
