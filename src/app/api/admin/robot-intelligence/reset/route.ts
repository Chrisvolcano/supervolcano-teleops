import { NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Only superadmin can reset
    requireRole(claims, ['superadmin']);
    
    console.log('[Robot Intelligence] Resetting database...');
    
    // Delete in correct order (respect foreign keys)
    const deletedMedia = await sql`DELETE FROM media RETURNING id`;
    const deletedJobs = await sql`DELETE FROM jobs RETURNING id`;
    const deletedLocations = await sql`DELETE FROM locations RETURNING id`;
    
    const mediaCount = Array.isArray(deletedMedia) ? deletedMedia.length : (deletedMedia as any)?.rows?.length || 0;
    const jobsCount = Array.isArray(deletedJobs) ? deletedJobs.length : (deletedJobs as any)?.rows?.length || 0;
    const locationsCount = Array.isArray(deletedLocations) ? deletedLocations.length : (deletedLocations as any)?.rows?.length || 0;
    
    console.log('[Robot Intelligence] Reset complete:', { locationsCount, jobsCount, mediaCount });
    
    return NextResponse.json({
      success: true,
      deleted: {
        locations: locationsCount,
        jobs: jobsCount,
        media: mediaCount,
      }
    });
  } catch (error: any) {
    console.error('[Robot Intelligence] Reset error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reset database' },
      { status: 500 }
    );
  }
}
