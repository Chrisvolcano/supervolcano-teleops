import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * Save media metadata to Firestore
 * File is already uploaded to Firebase Storage by client
 */
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
    
    const body = await request.json();
    const {
      jobId,
      locationId,
      mediaType,
      storageUrl,
      fileName,
      fileSize,
      mimeType,
      thumbnailUrl,
      durationSeconds,
    } = body;
    
    if (!jobId || !locationId || !storageUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: jobId, locationId, storageUrl' },
        { status: 400 }
      );
    }
    
    // Save metadata to Firestore
    const mediaRef = adminDb.collection('media').doc();
    
    await mediaRef.set({
      locationId,
      taskId: jobId, // Firestore uses "taskId" but it's actually a job ID
      mediaType: mediaType || 'video',
      storageUrl,
      thumbnailUrl: thumbnailUrl || null,
      fileName: fileName || 'uploaded-file',
      fileSize: fileSize || 0,
      mimeType: mimeType || 'video/mp4',
      durationSeconds: durationSeconds || null,
      uploadedBy: (claims as any)?.email || 'admin',
      uploadedAt: new Date(),
      createdAt: new Date(),
      processingStatus: 'completed',
      aiProcessed: false,
      momentsExtracted: 0,
      tags: [],
    });
    
    console.log(`Media metadata saved: ${mediaRef.id} for job ${jobId}`);
    
    return NextResponse.json({
      success: true,
      id: mediaRef.id,
      url: storageUrl,
      fileName: fileName || 'uploaded-file',
    });
  } catch (error: any) {
    console.error('Failed to save media metadata:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save metadata', details: error.message },
      { status: 500 }
    );
  }
}

