import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth, adminStorage } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { mediaIds } = body;

    if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json({ error: 'mediaIds array required' }, { status: 400 });
    }

    if (mediaIds.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 items per batch' }, { status: 400 });
    }

    const results = { deleted: [] as string[], failed: [] as { id: string; error: string }[] };

    for (const mediaId of mediaIds) {
      try {
        const mediaRef = adminDb.collection('media').doc(mediaId);
        const mediaDoc = await mediaRef.get();

        if (!mediaDoc.exists) {
          results.failed.push({ id: mediaId, error: 'Not found' });
          continue;
        }

        const mediaData = mediaDoc.data();
        const storageUrl = mediaData?.storageUrl || mediaData?.url || mediaData?.videoUrl;

        if (storageUrl) {
          try {
            const urlParts = storageUrl.split('/');
            const bucketIndex = urlParts.findIndex((part: string) => 
              part.includes('.appspot.com') || part === 'storage.googleapis.com'
            );
            if (bucketIndex !== -1) {
              const filePath = urlParts.slice(bucketIndex + 2).join('/');
              if (filePath) {
                const bucket = adminStorage.bucket();
                await bucket.file(decodeURIComponent(filePath)).delete().catch(() => {});
              }
            }
          } catch {}
        }

        await mediaRef.delete();
        results.deleted.push(mediaId);
      } catch (error: any) {
        results.failed.push({ id: mediaId, error: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      total: mediaIds.length,
      deleted: results.deleted.length,
      failed: results.failed.length,
      deletedIds: results.deleted,
      failedItems: results.failed,
    });
  } catch (error: any) {
    console.error('[API] Bulk delete error:', error);
    return NextResponse.json({ error: error.message || 'Bulk delete failed' }, { status: 500 });
  }
}
