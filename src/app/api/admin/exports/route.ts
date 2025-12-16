import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// POST /api/admin/exports
// Creates a training export for a partner
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

    const { 
      partnerId, 
      partnerName, 
      videoIds, 
      totalSizeBytes, 
      totalDurationSeconds,
      notes 
    } = await request.json();

    if (!partnerId || !videoIds || videoIds.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields: partnerId and videoIds' 
      }, { status: 400 });
    }

    const db = getAdminDb();

    const exportDoc = await db.collection('trainingExports').add({
      partnerId,
      partnerName: partnerName || partnerId,
      videoIds,
      videoCount: videoIds.length,
      totalSizeBytes: totalSizeBytes || 0,
      totalDurationSeconds: totalDurationSeconds || 0,
      status: 'completed',
      createdAt: FieldValue.serverTimestamp(),
      exportedAt: FieldValue.serverTimestamp(),
      exportedBy: claims.uid,
      notes: notes || `Exported ${videoIds.length} videos from Media Library`,
    });

    return NextResponse.json({
      success: true,
      exportId: exportDoc.id,
      videoCount: videoIds.length,
    });
  } catch (error: any) {
    console.error('[API] Create export error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create export' },
      { status: 500 }
    );
  }
}
