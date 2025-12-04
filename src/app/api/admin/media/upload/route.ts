import { NextRequest, NextResponse } from 'next/server';
import { adminStorage, adminDb } from '@/lib/firebaseAdmin';
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
    const jobId = formData.get('jobId') as string;
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
    
    // Get location to determine organization ID
    let organizationId = null;
    try {
      const locationDoc = await adminDb.collection('locations').doc(locationId).get();
      if (locationDoc.exists) {
        const locationData = locationDoc.data();
        organizationId = locationData?.assignedOrganizationId || locationData?.partnerOrgId || null;
      }
    } catch (error) {
      console.warn('Failed to fetch location for organization ID:', error);
    }
    
    // Save to Firestore media collection (source of truth)
    const mediaRef = adminDb.collection('media').doc();
    const now = new Date();
    
    await mediaRef.set({
      id: mediaRef.id,
      locationId,
      taskId: jobId, // Firestore uses taskId, but this may be a job ID
      jobId: jobId, // Also store as jobId for compatibility
      mediaType: mediaType || (file.type?.startsWith('video/') ? 'video' : 'image'),
      storageUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      uploadedBy: (claims as any)?.email || 'admin',
      uploadedAt: now,
      createdAt: now,
      organizationId: organizationId, // Store for reference
      processingStatus: 'completed',
      aiProcessed: false,
    });
    
    console.log(`Media uploaded to Firestore: ${mediaRef.id} for job ${jobId}`);
    
    // Note: Sync service will handle Firestore → SQL replication if needed for analytics
    
    return NextResponse.json({
      success: true,
      id: mediaRef.id,
      url: storageUrl,
      fileName: file.name,
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
