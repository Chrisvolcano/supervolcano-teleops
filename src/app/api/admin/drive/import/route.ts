import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getUserClaims } from '@/lib/utils/auth';
import { getAdminDb, getAdminStorage, getAdminAuth } from '@/lib/firebaseAdmin';
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

    const { accessToken, files, attribution } = await request.json();

    if (!accessToken || !files || files.length === 0) {
      return NextResponse.json({ error: 'accessToken and files required' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Get user uid from token
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const adminStorage = getAdminStorage();
    const bucket = adminStorage.bucket();
    const adminDb = getAdminDb();

    const results: Array<{ fileId: string; fileName: string; success: boolean; error?: string; mediaId?: string }> = [];

    for (const file of files) {
      try {
        console.log(`[Drive Import] Downloading: ${file.name}`);

        // Download file from Drive
        const response = await drive.files.get(
          { fileId: file.id, alt: 'media', supportsAllDrives: true },
          { responseType: 'stream' }
        );

        // Generate storage path
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `contributions/${uid}/${timestamp}_${safeName}`;

        // Upload to Firebase Storage
        const storageFile = bucket.file(storagePath);
        
        await new Promise<void>((resolve, reject) => {
          const writeStream = storageFile.createWriteStream({
            metadata: {
              contentType: file.mimeType,
            },
            resumable: false,
          });

          response.data
            .on('error', reject)
            .pipe(writeStream)
            .on('error', reject)
            .on('finish', resolve);
        });

        // Make file publicly accessible and get URL
        await storageFile.makePublic();
        const url = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

        // Get user email from Firebase Auth
        const firebaseUser = await adminAuth.getUser(uid);
        const userEmail = firebaseUser.email || 'admin@supervolcano.ai';

        // Create media document - AUTO APPROVED
        const mediaRef = await adminDb.collection('media').add({
          contributorId: uid,
          contributorEmail: userEmail,
          contributorName: attribution?.trim() || 'Google Drive Import',
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.mimeType,
          url,
          storagePath,
          durationSeconds: 0, // Can't extract from Drive easily
          locationText: null,
          source: 'web_contribute',
          reviewStatus: 'approved',
          reviewedAt: FieldValue.serverTimestamp(),
          reviewedBy: uid,
          blurStatus: 'none',
          blurredUrl: null,
          blurredStoragePath: null,
          facesDetected: null,
          blurError: null,
          driveFileId: file.id, // Track source
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        console.log(`[Drive Import] Success: ${file.name} -> ${mediaRef.id}`);
        results.push({ fileId: file.id, fileName: file.name, success: true, mediaId: mediaRef.id });
      } catch (err: any) {
        console.error(`[Drive Import] Failed: ${file.name}`, err);
        results.push({ fileId: file.id, fileName: file.name, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Imported ${successCount} of ${files.length} files`,
      successCount,
      failCount,
      results,
    });
  } catch (error: any) {
    console.error('[Drive Import] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

