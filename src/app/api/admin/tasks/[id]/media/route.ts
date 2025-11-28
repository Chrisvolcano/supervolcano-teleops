import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

/**
 * Get all media for a specific task
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('═══════════════════════════════════════');
  console.log('📹 MEDIA API - START');
  console.log('═══════════════════════════════════════');
  
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
    
    const taskId = params.id;
    console.log('Request params:', params);
    console.log('Task ID:', taskId);
    console.log('Task ID type:', typeof taskId);
    console.log('Task ID length:', taskId?.length);
    
    // Query Firestore
    console.log('Querying Firestore: collection(media).where(taskId, ==, ' + taskId + ')');
    
    let mediaSnap;
    try {
      mediaSnap = await adminDb
        .collection('media')
        .where('taskId', '==', taskId)
        .orderBy('uploadedAt', 'desc')
        .get();
    } catch (error: any) {
      // If index error, try without orderBy
      if (error.code === 9 || error.message?.includes('index')) {
        console.log('⚠️ MEDIA API: Index not found, querying without orderBy');
        mediaSnap = await adminDb
          .collection('media')
          .where('taskId', '==', taskId)
          .get();
      } else {
        throw error;
      }
    }
    
    console.log('Query completed. Size:', mediaSnap.size);
    console.log('Empty?', mediaSnap.empty);
    
    // If no results, try to debug why
    if (mediaSnap.empty) {
      console.log('⚠️ No media found. Checking all media documents...');
      
      // Get first 5 media docs to see what taskIds exist
      const allMediaSnap = await adminDb
        .collection('media')
        .limit(5)
        .get();
      
      console.log('Sample media documents in database:');
      allMediaSnap.docs.forEach((doc: QueryDocumentSnapshot) => {
        const data = doc.data();
        console.log('  -', {
          id: doc.id,
          taskId: data.taskId,
          jobId: data.jobId,
          taskIdType: typeof data.taskId,
          matches: data.taskId === taskId,
        });
      });
      
      // Try alternate field name (jobId)
      console.log('⚠️ Trying jobId field instead...');
      const jobIdSnap = await adminDb
        .collection('media')
        .where('jobId', '==', taskId)
        .get();
      
      if (!jobIdSnap.empty) {
        console.log('✅ Found media using jobId instead of taskId!');
        mediaSnap = jobIdSnap;
      }
    }
    
    const media = mediaSnap.docs.map((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      console.log('Processing media doc:', {
        id: doc.id,
        taskId: data.taskId,
        jobId: data.jobId,
        hasStorageUrl: !!data.storageUrl,
        storageUrlPreview: data.storageUrl?.substring(0, 50),
        mediaType: data.mediaType,
        fileType: data.fileType,
      });
      
      return {
        id: doc.id,
        taskId: data.taskId || data.jobId, // Support both field names
        locationId: data.locationId,
        storageUrl: data.storageUrl,
        thumbnailUrl: data.thumbnailUrl || null,
        mediaType: data.mediaType || (data.fileType?.includes('video') ? 'video' : 'image'),
        fileType: data.fileType || 'video/mp4',
        duration: data.duration || data.durationSeconds || null,
        uploadedAt: data.uploadedAt?.toDate?.()?.toISOString() || 
                    data.createdAt?.toDate?.()?.toISOString() || 
                    (data.uploadedAt instanceof Date ? data.uploadedAt.toISOString() : null),
        uploadedBy: data.uploadedBy || 'unknown',
        fileName: data.fileName || null,
      };
    });
    
    // Sort by uploadedAt if we didn't use orderBy
    if (media.length > 0) {
      media.sort((a, b) => {
        const aDate = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
        const bDate = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
        return bDate - aDate; // Descending
      });
    }
    
    console.log('Final media array length:', media.length);
    console.log('Returning response...');
    console.log('═══════════════════════════════════════');
    console.log('📹 MEDIA API - END');
    console.log('═══════════════════════════════════════');
    
    return NextResponse.json({
      success: true,
      media,
      count: media.length,
      debug: {
        taskId,
        querySize: mediaSnap.size,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error: any) {
    console.error('═══════════════════════════════════════');
    console.error('❌ MEDIA API - ERROR');
    console.error('═══════════════════════════════════════');
    console.error('Error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        code: error.code,
        media: [],
        count: 0
      },
      { status: 500 }
    );
  }
}
