/**
 * API Route: GET /api/admin/robot-intelligence/stats
 * Fetches stats for Robot Intelligence dashboard
 * 
 * Data sources:
 * - Locations: Firestore (source of truth)
 * - Media, Jobs, Shifts, Executions: Postgres (analytics)
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { adminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Auth check
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);

    // --- Locations count from Firestore ---
    let locationsCount = 0;
    try {
      const locationsSnapshot = await adminDb.collection('locations').count().get();
      locationsCount = locationsSnapshot.data().count;
    } catch (e) {
      console.error('[Stats] Error counting Firestore locations:', e);
    }

    // --- Media count from Firestore ---
    let mediaCount = 0;
    try {
      const mediaSnapshot = await adminDb.collection('media').count().get();
      mediaCount = mediaSnapshot.data().count;
    } catch (e) {
      console.error('[Stats] Error counting Firestore media:', e);
      // Fallback to Postgres if Firestore fails
      try {
        const mediaResult = await sql`SELECT COUNT(*)::int as count FROM media`;
        mediaCount = Array.isArray(mediaResult)
          ? Number(mediaResult[0]?.count || 0)
          : Number((mediaResult as any)?.rows?.[0]?.count || 0);
      } catch (pgError) {
        console.error('[Stats] Postgres media fallback failed:', pgError);
      }
    }

    // --- Jobs/Tasks count from Postgres ---
    let jobsCount = 0;
    try {
      const jobsResult = await sql`SELECT COUNT(*)::int as count FROM jobs`;
      jobsCount = Array.isArray(jobsResult)
        ? Number(jobsResult[0]?.count || 0)
        : Number((jobsResult as any)?.rows?.[0]?.count || 0);
    } catch (e) {
      console.error('[Stats] Error counting jobs:', e);
    }

    // --- Shifts count from Postgres ---
    let shiftsCount = 0;
    try {
      const shiftsResult = await sql`SELECT COUNT(*)::int as count FROM shifts`;
      shiftsCount = Array.isArray(shiftsResult)
        ? Number(shiftsResult[0]?.count || 0)
        : Number((shiftsResult as any)?.rows?.[0]?.count || 0);
    } catch (e) {
      // Table may not exist yet
      console.log('[Stats] Shifts table not found or empty');
    }

    // --- Robot executions count from Postgres ---
    let executionsCount = 0;
    try {
      const executionsResult = await sql`SELECT COUNT(*)::int as count FROM robot_executions`;
      executionsCount = Array.isArray(executionsResult)
        ? Number(executionsResult[0]?.count || 0)
        : Number((executionsResult as any)?.rows?.[0]?.count || 0);
    } catch (e) {
      // Table may not exist yet
      console.log('[Stats] Robot executions table not found or empty');
    }

    const stats = {
      locations: locationsCount,
      media: mediaCount,
      tasks: jobsCount,
      shifts: shiftsCount,
      executions: executionsCount,
    };

    console.log('[Stats] Robot Intelligence stats:', stats);
    
    return NextResponse.json(stats);

  } catch (error: any) {
    console.error('[Stats] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load stats' },
      { status: 500 }
    );
  }
}
