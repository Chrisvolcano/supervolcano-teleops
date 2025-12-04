import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth, adminStorage } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(
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
    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID required' }, { status: 400 });
    }

    const mediaRef = adminDb.collection('media').doc(mediaId);
    const mediaDoc = await mediaRef.get();

    if (!mediaDoc.exists) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
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
    return NextResponse.json({ success: true, deletedId: mediaId });
  } catch (error: any) {
    console.error('[API] Delete video error:', error);
    return NextResponse.json({ error: error.message || 'Delete failed' }, { status: 500 });
  }
}
