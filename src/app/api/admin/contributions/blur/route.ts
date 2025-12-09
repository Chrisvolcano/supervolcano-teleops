import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getUserClaims } from '@/lib/utils/auth';
import { videoBlurService } from '@/lib/services/video-blur/video-blur.service';
import { FieldValue } from 'firebase-admin/firestore';

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const claims = await getUserClaims(token);

    if (!claims || !['admin', 'superadmin', 'partner_admin'].includes(claims.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mediaId, action } = await request.json();

    if (!mediaId) {
      return NextResponse.json({ error: 'mediaId required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const mediaRef = adminDb.collection('media').doc(mediaId);
    const mediaDoc = await mediaRef.get();

    if (!mediaDoc.exists) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    const mediaData = mediaDoc.data();

    if (action === 'blur') {
      await mediaRef.update({
        blurStatus: 'processing',
        updatedAt: FieldValue.serverTimestamp(),
      });

      const result = await videoBlurService.blurVideo(
        mediaData!.url,
        mediaData!.storagePath
      );

      if (result.success) {
        await mediaRef.update({
          blurStatus: 'complete',
          blurredUrl: result.blurredUrl,
          blurredStoragePath: result.blurredStoragePath,
          facesDetected: result.facesDetected,
          blurredAt: FieldValue.serverTimestamp(),
          blurError: null,
          updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
          success: true,
          blurredUrl: result.blurredUrl,
          facesDetected: result.facesDetected,
          processingTimeMs: result.processingTimeMs,
        });
      } else {
        await mediaRef.update({
          blurStatus: 'failed',
          blurError: result.error,
          updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
          success: false,
          error: result.error,
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('[API] Blur error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

