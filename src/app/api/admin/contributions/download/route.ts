import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getUserClaims } from '@/lib/utils/auth';
import { Storage } from '@google-cloud/storage';

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';

const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'super-volcano-oem-portal.firebasestorage.app';

function getStorage() {
  return new Storage({
    credentials: {
      client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  });
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('mediaId');
    const type = searchParams.get('type') || 'blurred'; // 'blurred' or 'original'

    if (!mediaId) {
      return NextResponse.json({ error: 'mediaId required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const mediaDoc = await adminDb.collection('media').doc(mediaId).get();
    if (!mediaDoc.exists) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    const mediaData = mediaDoc.data()!;
    
    // Determine which file to download
    let filePath: string;
    let fileName: string;
    
    if (type === 'blurred' && mediaData.blurredStoragePath) {
      filePath = mediaData.blurredStoragePath;
      fileName = `blurred_${mediaData.fileName}`;
    } else {
      filePath = mediaData.storagePath;
      fileName = mediaData.fileName;
    }

    // Generate signed URL with content-disposition for download
    const storage = getStorage();
    const bucket = storage.bucket(bucketName);
    const [signedUrl] = await bucket.file(filePath).getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
      responseDisposition: `attachment; filename="${fileName}"`,
    });

    return NextResponse.json({ 
      success: true, 
      downloadUrl: signedUrl,
      fileName,
    });
  } catch (error: any) {
    console.error('[API] Download error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

