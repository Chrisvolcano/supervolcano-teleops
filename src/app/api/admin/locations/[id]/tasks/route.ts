import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);
    
    const result = await sql`
      SELECT 
        t.*,
        COUNT(DISTINCT m.id)::int as moment_count,
        COUNT(DISTINCT med.id)::int as media_count
      FROM tasks t
      LEFT JOIN moments m ON t.id = m.task_id
      LEFT JOIN media med ON t.id = med.task_id
      WHERE t.location_id = ${params.id}
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;
    
    return NextResponse.json({
      success: true,
      tasks: result.rows
    });
  } catch (error: any) {
    console.error('Failed to get tasks:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get tasks' },
      { status: 500 }
    );
  }
}

