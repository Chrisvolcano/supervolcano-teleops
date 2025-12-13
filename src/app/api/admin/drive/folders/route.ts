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

    // Query folders only
    const response = await drive.files.list({
      q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, mimeType)',
      orderBy: 'name',
      pageSize: 100,
    });

    const folders = await Promise.all(
      (response.data.files || []).map(async (file) => {
        // Check if folder has children
        const childCheck = await drive.files.list({
          q: `'${file.id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          fields: 'files(id)',
          pageSize: 1,
        });

        return {
          id: file.id!,
          name: file.name!,
          hasChildren: (childCheck.data.files?.length || 0) > 0,
        };
      })
    );

    return NextResponse.json({ folders });
  } catch (error: any) {
    console.error('[drive/folders] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

