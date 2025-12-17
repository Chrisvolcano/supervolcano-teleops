import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

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

    const { partnerId, videoId } = await request.json();

    if (!partnerId || !videoId) {
      return NextResponse.json({ error: 'Missing partnerId or videoId' }, { status: 400 });
    }

    const db = getAdminDb();

    // Find all exports for this partner and remove the video ID
    const exportsSnapshot = await db
      .collection('trainingExports')
      .where('partnerId', '==', partnerId)
      .get();

    const batch = db.batch();
    let updated = 0;

    exportsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const videoIds = data.videoIds || [];
      
      if (videoIds.includes(videoId)) {
        const newVideoIds = videoIds.filter((id: string) => id !== videoId);
        batch.update(doc.ref, { 
          videoIds: newVideoIds,
          videoCount: newVideoIds.length,
        });
        updated++;
      }
    });

    if (updated > 0) {
      await batch.commit();
    }

    return NextResponse.json({ 
      success: true, 
      message: `Removed from ${updated} export(s)` 
    });
  } catch (error: any) {
    console.error('[API] Remove video from export error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove video' },
      { status: 500 }
    );
  }
}
