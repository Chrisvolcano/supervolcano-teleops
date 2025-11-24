import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

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
    
    requireRole(claims, ['superadmin', 'admin', 'partner_admin', 'org_manager', 'teleoperator']);
    
    console.log(`Fetching media for job ${params.id}`);
    
    // Query Firestore for media where taskId matches (taskId is actually jobId in Firestore)
    const mediaSnap = await adminDb
      .collection('media')
      .where('taskId', '==', params.id)
      .orderBy('uploadedAt', 'desc')
      .get();
    
    console.log(`Found ${mediaSnap.size} media files`);
    
    const media = mediaSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        uploadedAt: data.uploadedAt?.toDate?.()?.toISOString() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    });
    
    return NextResponse.json({
      success: true,
      media
    });
  } catch (error: any) {
    console.error('Failed to get media:', error);
    
    // If it's an index error, return empty array instead of failing
    if (error.message?.includes('index')) {
      console.warn('Index not found, returning empty media array');
      return NextResponse.json({
        success: true,
        media: []
      });
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get media' },
      { status: 500 }
    );
  }
}
