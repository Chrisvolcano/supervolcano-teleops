import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);
    const claims = await getUserClaims(token);
    if (!claims) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    requireRole(claims, ['superadmin', 'admin']);

    const snapshot = await adminDb.collection('media').get();
    
    const breakdown = {
      total: snapshot.size,
      byType: {} as Record<string, number>,
      byMediaType: {} as Record<string, number>,
      byMimeType: {} as Record<string, number>,
      byExtension: {} as Record<string, number>,
      samples: [] as any[],
    };

    snapshot.docs.forEach((doc, i) => {
      const data = doc.data();
      const type = data.type || 'no_type';
      breakdown.byType[type] = (breakdown.byType[type] || 0) + 1;
      const mediaType = data.mediaType || 'no_mediaType';
      breakdown.byMediaType[mediaType] = (breakdown.byMediaType[mediaType] || 0) + 1;
      const mimeType = data.mimeType || data.contentType || 'no_mimeType';
      breakdown.byMimeType[mimeType] = (breakdown.byMimeType[mimeType] || 0) + 1;
      const fileName = data.fileName || data.name || '';
      const ext = fileName.split('.').pop()?.toLowerCase() || 'no_ext';
      breakdown.byExtension[ext] = (breakdown.byExtension[ext] || 0) + 1;
      if (i < 5) {
        breakdown.samples.push({ id: doc.id, type: data.type, mediaType: data.mediaType, mimeType: data.mimeType, fileName: data.fileName });
      }
    });

    return NextResponse.json(breakdown);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
