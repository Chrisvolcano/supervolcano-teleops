import { NextRequest, NextResponse } from 'next/server';
import { google, drive_v3 } from 'googleapis';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for large folders

async function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
}

// Recursively get all video files in folder and subfolders
async function scanFolderRecursive(
  drive: drive_v3.Drive,
  folderId: string,
  videoMimeTypes: string[]
): Promise<{ totalFiles: number; totalSize: number }> {
  let totalFiles = 0;
  let totalSize = 0;

  // Get all files (videos) in this folder
  let pageToken: string | undefined;
  do {
    const filesResponse = await drive.files.list({
      q: `'${folderId}' in parents and (${videoMimeTypes.map(m => `mimeType='${m}'`).join(' or ')}) and trashed=false`,
      fields: 'nextPageToken, files(id, size)',
      pageSize: 1000,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = filesResponse.data.files || [];
    totalFiles += files.length;
    totalSize += files.reduce((sum, f) => sum + parseInt(f.size || '0'), 0);
    pageToken = filesResponse.data.nextPageToken || undefined;
  } while (pageToken);

  // Get all subfolders and scan them recursively
  let folderPageToken: string | undefined;
  do {
    const foldersResponse = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'nextPageToken, files(id, name)',
      pageSize: 100,
      pageToken: folderPageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const subfolders = foldersResponse.data.files || [];
    
    for (const subfolder of subfolders) {
      const subResult = await scanFolderRecursive(drive, subfolder.id!, videoMimeTypes);
      totalFiles += subResult.totalFiles;
      totalSize += subResult.totalSize;
    }
    
    folderPageToken = foldersResponse.data.nextPageToken || undefined;
  } while (folderPageToken);

  return { totalFiles, totalSize };
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const claims = await getUserClaims(token);
    if (!claims) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    requireRole(claims, ['superadmin', 'admin']);

    // Get user UID from token
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const { folderId, sourceName } = await request.json();
    if (!folderId) return NextResponse.json({ error: 'folderId required' }, { status: 400 });

    const auth = await getAuth();
    const drive = google.drive({ version: 'v3', auth });

    // Verify folder exists and is accessible
    try {
      await drive.files.get({ 
        fileId: folderId, 
        fields: 'id, name',
        supportsAllDrives: true,
      });
    } catch (e) {
      return NextResponse.json({ 
        error: 'Cannot access folder. Make sure it is shared with the service account.' 
      }, { status: 400 });
    }

    const videoMimeTypes = [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
      'video/x-matroska',
      'video/mpeg',
      'video/3gpp',
    ];

    // Scan folder recursively
    const { totalFiles, totalSize } = await scanFolderRecursive(drive, folderId, videoMimeTypes);

    // Calculate hours (15 GB/hour for 1080p 30fps)
    const totalSizeGB = totalSize / (1024 * 1024 * 1024);
    const estimatedHours = totalSizeGB / 15;

    // Save to Firestore
    const db = getAdminDb();
    const sourceData = {
      folderId,
      name: sourceName || 'Google Drive',
      type: 'drive',
      videoCount: totalFiles,
      totalSizeBytes: totalSize,
      totalSizeGB: Math.round(totalSizeGB * 100) / 100,
      estimatedHours: Math.round(estimatedHours * 10) / 10,
      lastSync: new Date(),
      syncedBy: userId,
    };

    await db.collection('dataSources').doc(folderId).set(sourceData, { merge: true });

    return NextResponse.json({ success: true, ...sourceData });
  } catch (error: any) {
    console.error('[drive-sync] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const claims = await getUserClaims(token);
    if (!claims) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);

    const db = getAdminDb();
    const sourcesSnap = await db.collection('dataSources').where('type', '==', 'drive').get();
    const sources = sourcesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastSync: doc.data().lastSync?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({ sources });
  } catch (error: any) {
    console.error('[drive-sync] GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

