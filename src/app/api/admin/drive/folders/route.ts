import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const claims = await getUserClaims(token);
    if (!claims) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    requireRole(claims, ['superadmin', 'admin']);

    const driveToken = request.headers.get('x-drive-token');
    if (!driveToken) return NextResponse.json({ error: 'Drive token required' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId') || 'root';

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: driveToken });

    const drive = google.drive({ version: 'v3', auth });

    // Query folders only with Shared Drive support
    const response = await drive.files.list({
      q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, mimeType, driveId)',
      orderBy: 'name',
      pageSize: 100,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const folders = await Promise.all(
      (response.data.files || []).map(async (file) => {
        // Check if folder has children with Shared Drive support
        const childCheck = await drive.files.list({
          q: `'${file.id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          fields: 'files(id)',
          pageSize: 1,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });

        return {
          id: file.id!,
          name: file.name!,
          hasChildren: (childCheck.data.files?.length || 0) > 0,
        };
      })
    );

    // If parentId === 'root', also fetch shared drives
    let sharedDrives: Array<{ id: string; name: string; hasChildren: boolean; isSharedDrive: boolean }> = [];
    if (parentId === 'root') {
      try {
        const sharedDrivesResponse = await drive.drives.list({
          pageSize: 50,
          fields: 'drives(id, name)',
        });

        sharedDrives = (sharedDrivesResponse.data.drives || []).map(d => ({
          id: d.id!,
          name: d.name!,
          hasChildren: true,
          isSharedDrive: true,
        }));
      } catch (err) {
        // If user doesn't have access to shared drives, continue without them
        console.warn('[drive/folders] Could not fetch shared drives:', err);
      }
    }

    // Combine shared drives with regular folders
    const allFolders = [...sharedDrives, ...folders];

    return NextResponse.json({ folders: allFolders });
  } catch (error: any) {
    console.error('[drive/folders] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

