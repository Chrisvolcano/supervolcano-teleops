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
    console.log('🔍 MEDIA API: Loading media for task:', taskId);
    
    // Query Firestore for media
    // Try with orderBy first, fallback if index doesn't exist
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
    
    console.log('🔍 MEDIA API: Found media items:', mediaSnap.size);
    
    const media = mediaSnap.docs.map((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        uploadedAt: data.uploadedAt?.toDate?.()?.toISOString() || 
                    (data.uploadedAt instanceof Date ? data.uploadedAt.toISOString() : null),
        createdAt: data.createdAt?.toDate?.()?.toISOString() || 
                   (data.createdAt instanceof Date ? data.createdAt.toISOString() : null),
      };
    });
    
    // Sort by uploadedAt if we didn't use orderBy
    if (media.length > 0 && !media[0].uploadedAt) {
      // If no uploadedAt, keep original order
    } else {
      media.sort((a, b) => {
        const aDate = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
        const bDate = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
        return bDate - aDate; // Descending
      });
    }
    
    console.log('✅ MEDIA API: Returning', media.length, 'media items');
    
    return NextResponse.json({
      success: true,
      media,
      count: media.length
    });
  } catch (error: any) {
    console.error('❌ MEDIA API: Failed:', error);
    console.error('❌ MEDIA API: Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
