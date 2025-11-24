import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import { syncAllData } from '@/lib/services/sync/firestoreToSql';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow 60 seconds for sync

export async function POST(request: NextRequest) {
  console.log('═══════════════════════════════════════');
  console.log('🔄 SYNC START - Firestore → SQL');
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
    
    // Only allow superadmin, admin, and partner_admin
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);
    
    console.log('\n[SYNC API] Admin triggered full sync');
    
    const result = await syncAllData();
    
    if (result.success) {
      console.log('[SYNC API] Sync completed successfully');
      return NextResponse.json({
        success: true,
        message: result.message,
        results: {
          locations: result.counts?.locations?.synced || 0,
          jobs: result.counts?.jobs?.synced || 0,
          media: result.counts?.media?.synced || 0,
          errors: result.errors || [],
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error('[SYNC API] Sync completed with errors');
      return NextResponse.json({
        success: false,
        message: result.message || 'Sync completed with errors',
        results: {
          locations: result.counts?.locations?.synced || 0,
          jobs: result.counts?.jobs?.synced || 0,
          media: result.counts?.media?.synced || 0,
          errors: result.errors || [],
        },
      });
    }
  } catch (error: any) {
    console.error('═══════════════════════════════════════');
    console.error('❌ SYNC FAILED');
    console.error('═══════════════════════════════════════');
    console.error('Error:', error);
    console.error('Stack:', error.stack);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

