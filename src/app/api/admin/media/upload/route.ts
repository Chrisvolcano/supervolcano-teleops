import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { adminStorage } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large uploads

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
    const jobId = formData.get('jobId') as string; // Changed from taskId - media is linked to jobs
    const locationId = formData.get('locationId') as string;
    const mediaType = formData.get('mediaType') as string;
    
    if (!file || !jobId || !locationId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: file, jobId, locationId' },
        { status: 400 }
      );
    }
    
    // Check file size (500MB limit)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size is 500MB. File size: ${(file.size / 1024 / 1024).toFixed(2)}MB` },
        { status: 413 }
      );
    }
    
    // Check if file is too large for Vercel (100MB limit on free tier, 4.5MB on hobby)
    // Note: For larger files, consider using direct upload to Firebase Storage from client
    const vercelLimit = 4.5 * 1024 * 1024; // 4.5MB default Next.js limit
    if (file.size > vercelLimit) {
      return NextResponse.json(
        { 
          success: false, 
          error: `File too large for direct upload (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum is ${(vercelLimit / 1024 / 1024).toFixed(1)}MB. Consider using Firebase Storage direct upload for larger files.` 
        },
        { status: 413 }
      );
    }
    
    // Upload to Firebase Storage
    const bucket = adminStorage.bucket();
    const fileName = `media/${locationId}/${jobId}/${Date.now()}-${file.name}`;
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
    
    // Save to SQL database (media table uses job_id after migration)
    const result = await sql`
      INSERT INTO media (
        id, organization_id, location_id, job_id,
        media_type, storage_url, uploaded_by, uploaded_at, synced_at
      ) VALUES (
        gen_random_uuid(),
        ${organizationId},
        ${locationId},
        ${jobId},
        ${mediaType || 'image'},
        ${storageUrl},
        ${(claims as any).email || 'admin'},
        NOW(),
        NOW()
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
    
    // Handle 413 errors specifically
    if (error.message?.includes('413') || error.message?.includes('too large') || error.message?.includes('Request Entity Too Large')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'File too large. Maximum upload size is 4.5MB. For larger files, please use Firebase Storage direct upload.' 
        },
        { status: 413 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

