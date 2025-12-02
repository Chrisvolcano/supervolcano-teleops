import { NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);

    console.log('Fetching stats from SQL database...');

    // Debug: check what database we're connected to
    const dbInfo = await sql`SELECT current_database() as db, current_schema() as schema, current_user as user`;
    console.log('[DEBUG] Database info:', JSON.stringify(dbInfo));

    // Debug: try explicit schema
    const explicitCount = await sql`SELECT COUNT(*)::int as count FROM public.locations`;
    console.log('[DEBUG] Explicit public.locations count:', JSON.stringify(explicitCount));

    const locationsResult = await sql`SELECT COUNT(*)::int as count FROM locations`;
    console.log('[DEBUG] locationsResult:', JSON.stringify(locationsResult));
    console.log('[DEBUG] isArray:', Array.isArray(locationsResult));
    console.log('[DEBUG] first:', locationsResult[0]);
    const locationsCount = Array.isArray(locationsResult) 
      ? Number(locationsResult[0]?.count || 0)
      : Number((locationsResult as any)?.rows?.[0]?.count || 0);

    const jobsResult = await sql`SELECT COUNT(*)::int as count FROM jobs`;
    const jobsCount = Array.isArray(jobsResult)
      ? Number(jobsResult[0]?.count || 0)
      : Number((jobsResult as any)?.rows?.[0]?.count || 0);

    const mediaResult = await sql`SELECT COUNT(*)::int as count FROM media`;
    let mediaCount = 0;
    if (Array.isArray(mediaResult)) {
      mediaCount = Number(mediaResult[0]?.count || 0);
    } else {
      const rows = (mediaResult as any)?.rows || [];
      mediaCount = Number(rows[0]?.count || 0);
    }

    let shiftsCount = 0;
    try {
      const shiftsResult = await sql`SELECT COUNT(*) as count FROM shifts`;
      const shiftsArray = Array.isArray(shiftsResult) ? shiftsResult : (shiftsResult as any)?.rows || [];
      shiftsCount = parseInt(shiftsArray[0]?.count || '0');
    } catch (e) {
      console.log('Shifts table not found');
    }

    let executionsCount = 0;
    try {
      const executionsResult = await sql`SELECT COUNT(*) as count FROM robot_executions`;
      const executionsArray = Array.isArray(executionsResult) ? executionsResult : (executionsResult as any)?.rows || [];
      executionsCount = parseInt(executionsArray[0]?.count || '0');
    } catch (e) {
      console.log('Robot executions table not found');
    }

    const stats = {
      locations: locationsCount,
      shifts: shiftsCount,
      tasks: jobsCount,
      executions: executionsCount,
      media: mediaCount,
    };

    console.log('Robot Intelligence stats:', stats);
    return NextResponse.json(stats);

  } catch (error: any) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load stats' },
      { status: 500 }
    );
  }
}
