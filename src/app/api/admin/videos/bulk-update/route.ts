import { NextRequest, NextResponse } from 'next/server';
import { getUserClaims } from '@/lib/utils/auth';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await getAdminAuth().verifyIdToken(token);
    
    const claims = await getUserClaims(token);
    if (!claims || !['admin', 'superadmin'].includes(claims.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { videoIds, updates } = await request.json();

    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return NextResponse.json({ error: 'videoIds required' }, { status: 400 });
    }

    const db = getAdminDb();
    const batch = db.batch();

    for (const videoId of videoIds) {
      const docRef = db.collection('media').doc(videoId);
      batch.update(docRef, {
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    return NextResponse.json({ 
      success: true, 
      message: `Updated ${videoIds.length} videos` 
    });
  } catch (error: any) {
    console.error('[Bulk Update] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

