import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { google, drive_v3 } from 'googleapis';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/x-matroska',
  'video/mpeg',
  'video/3gpp',
];

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || functions.config().google?.service_account_email,
      private_key: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || functions.config().google?.service_account_private_key)?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
}

async function scanFolderRecursive(
  drive: drive_v3.Drive,
  folderId: string
): Promise<{ totalFiles: number; totalSize: number }> {
  let totalFiles = 0;
  let totalSize = 0;

  // Get videos in this folder
  let pageToken: string | undefined;
  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and (${VIDEO_MIME_TYPES.map(m => `mimeType='${m}'`).join(' or ')}) and trashed=false`,
      fields: 'nextPageToken, files(id, size)',
      pageSize: 1000,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    const files = response.data.files || [];
    totalFiles += files.length;
    totalSize += files.reduce((sum, f) => sum + parseInt(f.size || '0'), 0);
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  // Scan subfolders
  let folderPageToken: string | undefined;
  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'nextPageToken, files(id)',
      pageSize: 100,
      pageToken: folderPageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    for (const subfolder of response.data.files || []) {
      const sub = await scanFolderRecursive(drive, subfolder.id!);
      totalFiles += sub.totalFiles;
      totalSize += sub.totalSize;
    }
    folderPageToken = response.data.nextPageToken || undefined;
  } while (folderPageToken);

  return { totalFiles, totalSize };
}

// Run every 15 minutes
export const scheduledDriveSync = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context) => {
    const db = admin.firestore();
    
    // Get all drive sources
    const sourcesSnap = await db.collection('dataSources').where('type', '==', 'drive').get();
    
    if (sourcesSnap.empty) {
      console.log('No drive sources to sync');
      return null;
    }

    const auth = getAuth();
    const drive = google.drive({ version: 'v3', auth });

    for (const doc of sourcesSnap.docs) {
      const source = doc.data();
      const folderId = source.folderId;

      try {
        console.log(`Syncing drive source: ${source.name} (${folderId})`);
        
        const { totalFiles, totalSize } = await scanFolderRecursive(drive, folderId);
        const totalSizeGB = totalSize / (1024 * 1024 * 1024);
        const estimatedHours = totalSizeGB / 15;

        await doc.ref.update({
          videoCount: totalFiles,
          totalSizeBytes: totalSize,
          totalSizeGB: Math.round(totalSizeGB * 100) / 100,
          estimatedHours: Math.round(estimatedHours * 10) / 10,
          lastSync: admin.firestore.FieldValue.serverTimestamp(),
          lastSyncType: 'scheduled',
        });

        console.log(`Synced ${source.name}: ${totalFiles} videos, ${totalSizeGB.toFixed(2)} GB`);
      } catch (error) {
        console.error(`Failed to sync ${source.name}:`, error);
        await doc.ref.update({
          lastSyncError: error instanceof Error ? error.message : 'Unknown error',
          lastSyncAttempt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    return null;
  });

// Also create an HTTP trigger for manual sync from dashboard
export const manualDriveSync = functions.https.onCall(async (data, context) => {
  // Verify admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  const role = userDoc.data()?.role;
  if (!['admin', 'superadmin'].includes(role)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  const { folderId } = data;
  if (!folderId) {
    throw new functions.https.HttpsError('invalid-argument', 'folderId required');
  }

  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });

  try {
    const { totalFiles, totalSize } = await scanFolderRecursive(drive, folderId);
    const totalSizeGB = totalSize / (1024 * 1024 * 1024);
    const estimatedHours = totalSizeGB / 15;

    const db = admin.firestore();
    await db.collection('dataSources').doc(folderId).update({
      videoCount: totalFiles,
      totalSizeBytes: totalSize,
      totalSizeGB: Math.round(totalSizeGB * 100) / 100,
      estimatedHours: Math.round(estimatedHours * 10) / 10,
      lastSync: admin.firestore.FieldValue.serverTimestamp(),
      lastSyncType: 'manual',
    });

    return { success: true, videoCount: totalFiles, totalSizeGB, estimatedHours };
  } catch (error) {
    console.error('Manual sync failed:', error);
    throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Sync failed');
  }
});

