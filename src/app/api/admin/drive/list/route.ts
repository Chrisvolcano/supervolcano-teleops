import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getUserClaims } from '@/lib/utils/auth';

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

    const { accessToken, folderUrl } = await request.json();

    if (!accessToken || !folderUrl) {
      return NextResponse.json({ error: 'accessToken and folderUrl required' }, { status: 400 });
    }

    // Extract folder ID from URL
    // Formats: 
    // https://drive.google.com/drive/folders/FOLDER_ID
    // https://drive.google.com/drive/u/0/folders/FOLDER_ID
    const folderIdMatch = folderUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
    if (!folderIdMatch) {
      return NextResponse.json({ error: 'Invalid Google Drive folder URL' }, { status: 400 });
    }

    const folderId = folderIdMatch[1];

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Get folder name
    const folderInfo = await drive.files.get({
      fileId: folderId,
      fields: 'name',
      supportsAllDrives: true,
    });

    // List video files in folder
    const response = await drive.files.list({
      q: `'${folderId}' in parents and (mimeType contains 'video/') and trashed = false`,
      fields: 'files(id, name, mimeType, size, createdTime, thumbnailLink)',
      orderBy: 'createdTime desc',
      pageSize: 100,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = (response.data.files || []).map(file => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: parseInt(file.size || '0'),
      createdTime: file.createdTime,
      thumbnailLink: file.thumbnailLink,
    }));

    return NextResponse.json({ 
      success: true,
      folderName: folderInfo.data.name,
      folderId,
      files,
    });
  } catch (error: any) {
    console.error('[Drive List] Error:', error);
    if (error.code === 404) {
      return NextResponse.json({ error: 'Folder not found or not accessible' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

