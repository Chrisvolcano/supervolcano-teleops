import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { adminStorage } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Admin auth check
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const taskId = formData.get('taskId') as string;
    const locationId = formData.get('locationId') as string;
    const mediaType = formData.get('mediaType') as string;
    
    if (!file || !taskId || !locationId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: file, taskId, locationId' },
        { status: 400 }
      );
    }
    
    // Upload to Firebase Storage
    const bucket = adminStorage.bucket();
    const fileName = `media/${locationId}/${taskId}/${Date.now()}-${file.name}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    const fileUpload = bucket.file(fileName);
    await fileUpload.save(fileBuffer, {
      metadata: {
        contentType: file.type,
      },
    });
    
    // Make public (or use signed URLs for private)
    await fileUpload.makePublic();
    const storageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    
    // Get organization ID from location
    const locationResult = await sql`
      SELECT organization_id FROM locations WHERE id = ${locationId}
    `;
    
    const organizationId = locationResult.rows[0]?.organization_id || null;
    
    // Save to SQL database
    const result = await sql`
      INSERT INTO media (
        organization_id, location_id, task_id,
        media_type, storage_url, uploaded_by
      ) VALUES (
        ${organizationId},
        ${locationId},
        ${taskId},
        ${mediaType || 'image'},
        ${storageUrl},
        ${(claims as any).email || 'admin'}
      )
      RETURNING id
    `;
    
    return NextResponse.json({
      success: true,
      id: result.rows[0].id,
      url: storageUrl
    });
  } catch (error: any) {
    console.error('Media upload error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

