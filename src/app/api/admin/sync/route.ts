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
    
    console.log('\n[SYNC API] Admin triggered full sync');
    
    const result = await syncAllData();
    
    if (result.success) {
      console.log('[SYNC API] Sync completed successfully');
      return NextResponse.json({
        success: true,
        message: result.message,
        counts: result.counts,
        details: result.details,
      });
    } else {
      console.error('[SYNC API] Sync completed with errors');
      return NextResponse.json({
        success: false,
        message: result.message || 'Sync completed with errors',
        counts: result.counts,
        errors: result.errors,
        details: result.details,
      });
    }
  } catch (error: any) {
    console.error('[sync] Sync API error:', error);
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}

