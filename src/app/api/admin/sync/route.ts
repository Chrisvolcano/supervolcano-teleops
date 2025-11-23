import { NextResponse } from 'next/server';
import { syncAllData } from '@/lib/services/sync/firestoreToSql';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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
    
    // Only allow superadmin, admin, and partner_admin
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);
    
    console.log('[sync] Starting sync process...');
    const result = await syncAllData();
    console.log('[sync] Sync result:', result);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Data synced successfully',
        stats: result.stats,
      });
    } else {
      console.error('[sync] Sync failed:', result.error, result.details);
      return NextResponse.json(
        { 
          error: result.error,
          details: process.env.NODE_ENV === 'development' ? result.details : undefined
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[sync] Sync API error:', error);
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}

