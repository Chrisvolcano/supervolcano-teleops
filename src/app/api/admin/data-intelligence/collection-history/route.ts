import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const claims = await getUserClaims(token);
    if (!claims) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);

    const db = getAdminDb();
    
    // Get all data sources
    const sourcesSnap = await db.collection('dataSources').where('type', '==', 'drive').get();
    
    // Aggregate history from all sources
    const dateMap = new Map<string, { videos: number; hours: number; sizeGB: number }>();
    
    for (const doc of sourcesSnap.docs) {
      const historySnap = await doc.ref.collection('syncHistory')
        .orderBy('timestamp', 'desc')
        .limit(30) // Last 30 syncs per source
        .get();
      
      for (const histDoc of historySnap.docs) {
        const data = histDoc.data();
        const timestamp = data.timestamp?.toDate?.();
        if (!timestamp) continue;
        
        const date = timestamp.toISOString().split('T')[0];
        
        const existing = dateMap.get(date) || { videos: 0, hours: 0, sizeGB: 0 };
        dateMap.set(date, {
          videos: Math.max(existing.videos, data.videoCount || 0),
          hours: Math.max(existing.hours, data.totalHours || 0),
          sizeGB: Math.max(existing.sizeGB, data.totalSizeGB || 0),
        });
      }
    }
    
    // Convert to sorted array
    const history = Array.from(dateMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ history });
  } catch (error: any) {
    console.error('[collection-history] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

