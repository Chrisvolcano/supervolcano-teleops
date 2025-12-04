/**
 * POST /api/admin/videos/[id]/approve-training
 * 
 * Approve a processed video for the training corpus.
 * This syncs to PostgreSQL training_videos (anonymized).
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import { videoProcessingPipeline } from '@/lib/services/video-intelligence/processing-pipeline.service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);
    
    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);
    
    const mediaId = params.id;
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'approve'; // 'approve' or 'reject'
    
    if (action === 'approve') {
      const result = await videoProcessingPipeline.syncToTrainingCorpus(mediaId);
      return NextResponse.json(result);
    } else if (action === 'reject') {
      const result = await videoProcessingPipeline.rejectFromTraining(mediaId);
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[API] Training approval error:', error);
    return NextResponse.json(
      { error: error.message || 'Approval failed' },
      { status: 500 }
    );
  }
}

