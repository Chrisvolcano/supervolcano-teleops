import { NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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
    
    // Get stats from SQL database
    console.log('📊 Fetching stats from SQL database...');
    
    // Count locations
    const locationsResult = await sql`SELECT COUNT(*) as count FROM locations`;
    const locationsArray = Array.isArray(locationsResult) ? locationsResult : (locationsResult as any)?.rows || [];
    const locationsCount = parseInt(locationsArray[0]?.count || '0');
    
    // Count jobs (not tasks - we renamed it)
    const jobsResult = await sql`SELECT COUNT(*) as count FROM jobs`;
    const jobsArray = Array.isArray(jobsResult) ? jobsResult : (jobsResult as any)?.rows || [];
    const jobsCount = parseInt(jobsArray[0]?.count || '0');
    
    // Count media
    const mediaResult = await sql`SELECT COUNT(*) as count FROM media`;
    const mediaArray = Array.isArray(mediaResult) ? mediaResult : (mediaResult as any)?.rows || [];
    const mediaCount = parseInt(mediaArray[0]?.count || '0');
    
    // Count shifts (sessions) if table exists
    let shiftsCount = 0;
    try {
      const shiftsResult = await sql`SELECT COUNT(*) as count FROM shifts`;
      const shiftsArray = Array.isArray(shiftsResult) ? shiftsResult : (shiftsResult as any)?.rows || [];
      shiftsCount = parseInt(shiftsArray[0]?.count || '0');
    } catch (e) {
      // Shifts table might not exist, that's okay
      console.log('Shifts table not found, skipping');
    }
    
    // Count executions if table exists
    let executionsCount = 0;
    try {
      const executionsResult = await sql`SELECT COUNT(*) as count FROM robot_executions`;
      const executionsArray = Array.isArray(executionsResult) ? executionsResult : (executionsResult as any)?.rows || [];
      executionsCount = parseInt(executionsArray[0]?.count || '0');
    } catch (e) {
      // Executions table might not exist, that's okay
      console.log('Robot executions table not found, skipping');
    }
    
    const stats = {
      locations: locationsCount,
      shifts: shiftsCount,
      tasks: jobsCount, // jobs are called "tasks" in the UI
      executions: executionsCount,
      media: mediaCount,
    };
    
    console.log('✅ Robot Intelligence stats:', stats);
    
    return NextResponse.json(stats);
    
  } catch (error: any) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load stats' },
      { status: 500 }
    );
  }
}

