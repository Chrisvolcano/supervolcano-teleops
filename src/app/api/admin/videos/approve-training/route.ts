/**
 * POST /api/admin/videos/approve-training
 * 
 * Bulk approve/reject videos for training corpus.
 * Handles multiple videos in a single request for efficiency.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import { videoProcessingPipeline } from '@/lib/services/video-intelligence/processing-pipeline.service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Auth check
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
    
    const body = await request.json();
    const { mediaIds, action } = body;
    
    // Validate input
    if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json({ error: 'mediaIds array required' }, { status: 400 });
    }
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });
    }
    
    // Limit batch size to prevent timeout
    const MAX_BATCH = 50;
    if (mediaIds.length > MAX_BATCH) {
      return NextResponse.json({ 
        error: `Maximum ${MAX_BATCH} videos per batch` 
      }, { status: 400 });
    }
    
    // Process each video
    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];
    
    for (const mediaId of mediaIds) {
      try {
        let result;
        if (action === 'approve') {
          result = await videoProcessingPipeline.syncToTrainingCorpus(mediaId);
        } else {
          result = await videoProcessingPipeline.rejectFromTraining(mediaId);
        }
        
        if (result.success) {
          succeeded.push(mediaId);
        } else {
          failed.push({ id: mediaId, error: result.error || 'Unknown error' });
        }
      } catch (error: any) {
        failed.push({ id: mediaId, error: error.message });
      }
    }
    
    return NextResponse.json({
      success: true,
      action,
      total: mediaIds.length,
      succeeded,
      failed,
    });
  } catch (error: any) {
    console.error('[API] Bulk training action error:', error);
    return NextResponse.json(
      { error: error.message || 'Bulk action failed' },
      { status: 500 }
    );
  }
}

