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
    const [locationsResult, shiftsResult, tasksResult, executionsResult] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM locations`,
      sql`SELECT COUNT(*) as count FROM shifts`,
      sql`SELECT COUNT(*) as count FROM tasks`, // Changed from moments
      sql`SELECT COUNT(*) as count FROM robot_executions`,
    ]);
    
    return NextResponse.json({
      locations: parseInt(locationsResult.rows[0].count as string) || 0,
      shifts: parseInt(shiftsResult.rows[0].count as string) || 0,
      tasks: parseInt(tasksResult.rows[0].count as string) || 0, // Changed from moments
      executions: parseInt(executionsResult.rows[0].count as string) || 0,
    });
    
  } catch (error: any) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load stats' },
      { status: 500 }
    );
  }
}

