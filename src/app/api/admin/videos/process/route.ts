/**
 * POST /api/admin/videos/process
 * 
 * Trigger video processing for a specific media item or process queue
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import { videoProcessingPipeline } from '@/lib/services/video-intelligence/processing-pipeline.service';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Check admin role
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);

    const body = await request.json();
    const { mediaId, action = 'process_single' } = body;

    switch (action) {
      case 'process_single':
      case 'reanalyze':
        if (!mediaId) {
          return NextResponse.json({ error: 'mediaId required' }, { status: 400 });
        }
        
        // For reanalyze, reset the status first
        if (action === 'reanalyze') {
          await adminDb.collection('media').doc(mediaId).update({
            aiStatus: 'pending',
            aiError: null,
            aiAnnotations: null,
            aiObjectLabels: null,
            aiRoomType: null,
            aiActionTypes: null,
            aiQualityScore: null,
          });
        }
        
        await videoProcessingPipeline.queueVideo(mediaId, 10); // High priority
        const result = await videoProcessingPipeline.processNext();
        return NextResponse.json({ 
          success: result.processed,
          mediaId,
          error: result.error 
        });

      case 'process_batch':
        const batchSize = body.batchSize || 5;
        const batchResult = await videoProcessingPipeline.processBatch(batchSize);
        return NextResponse.json(batchResult);

      case 'retry_failed':
        const retryCount = await videoProcessingPipeline.retryFailed();
        return NextResponse.json({ retriedCount: retryCount });

      case 'queue_stats':
        const stats = await videoProcessingPipeline.getQueueStats();
        return NextResponse.json(stats);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[API] Video processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Processing failed' },
      { status: 500 }
    );
  }
}

