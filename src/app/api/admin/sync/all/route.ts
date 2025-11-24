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
    
    // STEP 0: Test database connection and verify tables exist
    console.log('Testing database connection...');
    try {
      await sql`SELECT NOW()`;
      console.log('✅ Database connected');
    } catch (dbError: any) {
      console.error('❌ Database connection failed:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: `Database connection failed: ${dbError.message}`,
          message: 'Please check your DATABASE_URL environment variable',
        },
        { status: 500 }
      );
    }

    // Check if tables exist
    console.log('Checking if tables exist...');
    try {
      const tables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('locations', 'jobs', 'media')
      `;
      
      if (tables.length !== 3) {
        const missingTables = ['locations', 'jobs', 'media'].filter(
          (name) => !tables.some((t: any) => t.table_name === name)
        );
        console.error(`❌ Missing database tables: ${missingTables.join(', ')}`);
        return NextResponse.json(
          {
            success: false,
            error: `Missing database tables: ${missingTables.join(', ')}`,
            message: 'Please run the "Setup Database" button first to create the required tables',
          },
          { status: 400 }
        );
      }
      console.log('✅ All tables exist');
    } catch (tableCheckError: any) {
      console.error('❌ Failed to check tables:', tableCheckError);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to verify database tables: ${tableCheckError.message}`,
        },
        { status: 500 }
      );
    }
    
    const result = await syncAllData();
    
    if (result.success) {
      console.log('[SYNC API] Sync completed successfully');
      return NextResponse.json({
        success: true,
        message: result.message,
        results: {
          locations: result.counts?.locations || 0,
          jobs: result.counts?.jobs || 0,
          media: result.counts?.media || 0,
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
          locations: result.counts?.locations || 0,
          jobs: result.counts?.jobs || 0,
          media: result.counts?.media || 0,
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

