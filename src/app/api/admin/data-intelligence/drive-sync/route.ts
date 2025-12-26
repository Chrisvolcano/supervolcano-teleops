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

// Get parent chain for hierarchy detection
async function getParentChain(drive: drive_v3.Drive, folderId: string, driveId?: string): Promise<string[]> {
  const parents: string[] = [];
  let currentId = folderId;
  
  while (currentId) {
    try {
      const file = await drive.files.get({
        fileId: currentId,
        fields: 'parents',
        supportsAllDrives: true,
      });
      
      const parentId = file.data.parents?.[0];
      if (parentId && parentId !== driveId) {
        parents.push(parentId);
        currentId = parentId;
      } else {
        break;
      }
    } catch {
      break;
    }
  }
  
  return parents;
}

interface SubfolderInfo {
  id: string;
  name: string;
  videoCount: number;
  totalSizeGB: number;
  totalHours: number;
  deliveredCount: number;  // Videos in "Processed" folders
  children?: SubfolderInfo[];  // Nested subfolders (up to 3 levels)
}

// Recursively get all video files in folder and subfolders
async function scanFolderRecursive(
  drive: drive_v3.Drive,
  folderId: string,
  videoMimeTypes: string[],
  driveId?: string,  // Pass driveId for shared drive queries
  collectSubfolders: boolean = false,
  depth: number = 0  // Add depth parameter for 3-level nesting
): Promise<{ 
  totalFiles: number; 
  totalSize: number; 
  totalDurationMs: number; 
  filesWithDuration: number;
  deliveredFiles: number;  // Add delivered tracking
  deliveredSize: number;      // Add delivered size
  deliveredDurationMs: number; // Add delivered duration
  subfolders?: SubfolderInfo[];
}> {
  let totalFiles = 0;
  let totalSize = 0;
  let totalDurationMs = 0;
  let filesWithDuration = 0;
  let deliveredFiles = 0;
  let deliveredSize = 0;
  let deliveredDurationMs = 0;

  // Query parameters for shared drive support
  const listParams: any = {
    q: `'${folderId}' in parents and (${videoMimeTypes.map(m => `mimeType='${m}'`).join(' or ')}) and trashed=false`,
    fields: 'nextPageToken, files(id, size, videoMediaMetadata)',
    pageSize: 1000,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  };
  
  // If it's a shared drive, add corpora and driveId
  if (driveId) {
    listParams.corpora = 'drive';
    listParams.driveId = driveId;
  }

  // Get all files (videos) in this folder
  let pageToken: string | undefined;
  do {
    const filesResponse = await drive.files.list({ ...listParams, pageToken });

    const files = filesResponse.data.files || [];
    totalFiles += files.length;
    for (const file of files) {
      totalSize += parseInt(file.size || '0');
      if (file.videoMediaMetadata?.durationMillis) {
        totalDurationMs += parseInt(file.videoMediaMetadata.durationMillis);
        filesWithDuration++;
      }
    }
    pageToken = filesResponse.data.nextPageToken || undefined;
  } while (pageToken);

  // Get subfolders with same shared drive support
  const folderParams: any = {
    q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'nextPageToken, files(id, name, driveId)',  // Add name to fields
    pageSize: 100,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  };
  
  if (driveId) {
    folderParams.corpora = 'drive';
    folderParams.driveId = driveId;
  }

  // Get all subfolders and scan them recursively
  let folderPageToken: string | undefined;
  const subfolderInfos: SubfolderInfo[] = [];
  
  do {
    const foldersResponse = await drive.files.list({ ...folderParams, pageToken: folderPageToken });

    const subfoldersList = foldersResponse.data.files || [];
    
    for (const subfolder of subfoldersList) {
      const isProcessedFolder = subfolder.name?.toLowerCase().includes('processed') || false;
      
      // Scan subfolder - only collect nested subfolders if depth < 2
      const sub = await scanFolderRecursive(
        drive, 
        subfolder.id!, 
        videoMimeTypes, 
        driveId || subfolder.driveId || undefined,
        collectSubfolders && depth < 2,  // Only collect children up to level 2
        depth + 1
      );
      
      totalFiles += sub.totalFiles;
      totalSize += sub.totalSize;
      totalDurationMs += sub.totalDurationMs;
      filesWithDuration += sub.filesWithDuration;
      
      // Track delivered metrics
      if (isProcessedFolder) {
        // If this folder is "Processed", ALL its files are delivered
        deliveredFiles += sub.totalFiles;
        deliveredSize += sub.totalSize;
        deliveredDurationMs += sub.totalDurationMs;
        // Don't add nested delivered counts - they're already included in totalFiles/totalSize/totalDurationMs
      } else {
        // If this folder is NOT "Processed", only count nested delivered files
        deliveredFiles += sub.deliveredFiles || 0;
        deliveredSize += sub.deliveredSize || 0;
        deliveredDurationMs += sub.deliveredDurationMs || 0;
      }
      
      // Collect subfolder info if requested
      if (collectSubfolders) {
        const subTotalSizeGB = sub.totalSize / (1024 * 1024 * 1024);
        let subTotalHours: number;
        
        // Calculate hours similar to main logic
        if (sub.filesWithDuration === sub.totalFiles && sub.totalFiles > 0) {
          subTotalHours = sub.totalDurationMs / (1000 * 60 * 60);
        } else if (sub.filesWithDuration === 0) {
          subTotalHours = subTotalSizeGB / 15;
        } else {
          const avgDurationPerFile = sub.totalDurationMs / sub.filesWithDuration;
          const filesWithoutDuration = sub.totalFiles - sub.filesWithDuration;
          const estimatedMissingMs = avgDurationPerFile * filesWithoutDuration;
          subTotalHours = (sub.totalDurationMs + estimatedMissingMs) / (1000 * 60 * 60);
        }
        
        // Calculate delivered hours and size for this subfolder
        const subDeliveredHours = isProcessedFolder 
          ? Math.round((sub.totalDurationMs / (1000 * 60 * 60)) * 100) / 100 
          : Math.round(((sub.deliveredDurationMs || 0) / (1000 * 60 * 60)) * 100) / 100;
        const subDeliveredSizeGB = isProcessedFolder
          ? Math.round((sub.totalSize / (1024 * 1024 * 1024)) * 100) / 100
          : Math.round(((sub.deliveredSize || 0) / (1024 * 1024 * 1024)) * 100) / 100;
        
        subfolderInfos.push({
          id: subfolder.id!,
          name: subfolder.name || 'Unknown',
          videoCount: sub.totalFiles,
          totalSizeGB: Math.round(subTotalSizeGB * 100) / 100,
          totalHours: Math.round(subTotalHours * 100) / 100,
          deliveredCount: isProcessedFolder ? sub.totalFiles : (sub.deliveredFiles || 0),
          deliveredHours: subDeliveredHours,
          deliveredSizeGB: subDeliveredSizeGB,
          children: sub.subfolders,  // Include nested children
        });
      }
    }
    
    folderPageToken = foldersResponse.data.nextPageToken || undefined;
  } while (folderPageToken);

  return { 
    totalFiles, 
    totalSize, 
    totalDurationMs, 
    filesWithDuration,
    deliveredFiles,
    deliveredSize,
    deliveredDurationMs,
    subfolders: collectSubfolders ? subfolderInfos : undefined
  };
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

    // Check if folderId is a shared drive root
    let driveId: string | undefined;
    try {
      const driveInfo = await drive.drives.get({ driveId: folderId });
      if (driveInfo.data.id) {
        driveId = folderId; // It's a shared drive root
      }
    } catch {
      // Not a shared drive root, check if it's a folder (possibly within a shared drive)
      try {
        const fileInfo = await drive.files.get({ 
          fileId: folderId, 
          fields: 'id, name, driveId',
          supportsAllDrives: true,
        });
        // If folder is within a shared drive, use its driveId
        if (fileInfo.data.driveId) {
          driveId = fileInfo.data.driveId;
        }
      } catch (e) {
        console.error('Folder access error:', e);
        return NextResponse.json({ 
          error: 'Cannot access folder. Make sure it is shared with the service account.' 
        }, { status: 400 });
      }
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

    // Get parent chain for hierarchy detection
    const parentChain = await getParentChain(drive, folderId, driveId);

    // Scan folder recursively (collect subfolders for top-level scan)
    const { totalFiles, totalSize, totalDurationMs, filesWithDuration, deliveredFiles, deliveredSize, deliveredDurationMs, subfolders } = await scanFolderRecursive(drive, folderId, videoMimeTypes, driveId, true, 0);

    const totalSizeGB = totalSize / (1024 * 1024 * 1024);
    // Use real duration if available, otherwise estimate
    let totalHours: number;
    let durationSource: 'exact' | 'estimated' | 'mixed';
    if (filesWithDuration === totalFiles && totalFiles > 0) {
      // All files have duration metadata
      totalHours = totalDurationMs / (1000 * 60 * 60);
      durationSource = 'exact';
    } else if (filesWithDuration === 0) {
      // No files have duration, estimate from size
      totalHours = totalSizeGB / 15;
      durationSource = 'estimated';
    } else {
      // Some files have duration, calculate weighted estimate
      const avgDurationPerFile = totalDurationMs / filesWithDuration;
      const filesWithoutDuration = totalFiles - filesWithDuration;
      const estimatedMissingMs = avgDurationPerFile * filesWithoutDuration;
      totalHours = (totalDurationMs + estimatedMissingMs) / (1000 * 60 * 60);
      durationSource = 'mixed';
    }

    // Save to Firestore
    const db = getAdminDb();
    
    // Get previous sync data for delta calculation
    const previousDoc = await db.collection('dataSources').doc(folderId).get();
    const previousData = previousDoc.exists ? previousDoc.data() : null;
    
    const sourceData = {
      folderId,
      name: sourceName || 'Google Drive',
      type: 'drive',
      videoCount: totalFiles,
      totalSizeBytes: totalSize,
      totalSizeGB: Math.round(totalSizeGB * 100) / 100,
      totalHours: Math.round(totalHours * 100) / 100,
      totalMinutes: Math.round(totalHours * 60),
      durationSource,
      filesWithDuration,
      totalDurationMs,
      deliveredCount: deliveredFiles,  // Add delivered count
      deliveredHours: Math.round((deliveredDurationMs / (1000 * 60 * 60)) * 100) / 100,
      deliveredSizeGB: Math.round((deliveredSize / (1024 * 1024 * 1024)) * 100) / 100,
      parentChain,  // Array of parent folder IDs
      driveId: driveId || null,  // The shared drive ID if applicable
      subfolders: subfolders || [],  // Array of subfolder info
      previousSync: previousData ? {
        videoCount: previousData.videoCount || 0,
        totalHours: previousData.totalHours || 0,
        totalSizeGB: previousData.totalSizeGB || 0,
        syncedAt: previousData.lastSync || null,
      } : null,
      lastSync: new Date(),
      syncedBy: userId,
    };

    await db.collection('dataSources').doc(folderId).set(sourceData, { merge: true });
    
    // Save sync history entry
    await db.collection('dataSources').doc(folderId).collection('syncHistory').add({
      timestamp: new Date(),
      videoCount: totalFiles,
      totalHours: Math.round(totalHours * 100) / 100,
      totalSizeGB: Math.round(totalSizeGB * 100) / 100,
      filesWithDuration,
    });

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
    const sources = sourcesSnap.docs.map(doc => {
      const data = doc.data() as {
        name?: string;
        type?: string;
        videoCount?: number;
        totalSizeGB?: number;
        totalHours?: number;
        parentChain?: string[];
        driveId?: string | null;
        subfolders?: SubfolderInfo[];
        deliveredCount?: number;
        durationSource?: string;
        filesWithDuration?: number;
        lastSync?: any;
        [key: string]: any;
      };
      
      return {
        id: doc.id,
        ...data,
        lastSync: data.lastSync?.toDate?.()?.toISOString() || null,
      };
    });

    // Determine which sources are "root" (not children of other sources)
    const allFolderIds = new Set(sources.map(s => s.id));

    const sourcesWithRootFlag = sources.map(source => {
      // A source is a root if none of its parents are in our data sources
      const isRoot = !source.parentChain?.some(parentId => allFolderIds.has(parentId));
      return { ...source, isRoot };
    });

    // Calculate deduplicated totals (only count root sources)
    const rootSources = sourcesWithRootFlag.filter(s => s.isRoot);
    const deduplicatedTotals = {
      totalVideos: rootSources.reduce((sum, s) => sum + (s.videoCount || 0), 0),
      totalHours: rootSources.reduce((sum, s) => sum + (s.totalHours || 0), 0),
      totalSizeGB: rootSources.reduce((sum, s) => sum + (s.totalSizeGB || 0), 0),
    };

    // Calculate raw totals (all sources, including duplicates)
    const rawTotals = {
      totalVideos: sources.reduce((sum, s) => sum + (s.videoCount || 0), 0),
      totalHours: sources.reduce((sum, s) => sum + (s.totalHours || 0), 0),
      totalSizeGB: sources.reduce((sum, s) => sum + (s.totalSizeGB || 0), 0),
    };

    return NextResponse.json({ 
      sources: sourcesWithRootFlag,
      deduplicatedTotals,
      rawTotals,
    });
  } catch (error: any) {
    console.error('[drive-sync] GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

