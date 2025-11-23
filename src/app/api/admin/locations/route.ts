import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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
    
    const result = await sql`
      SELECT 
        l.*,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT m.id) as moment_count
      FROM locations l
      LEFT JOIN tasks t ON l.id = t.location_id
      LEFT JOIN moments m ON l.id = m.location_id
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `;
    
    return NextResponse.json({
      success: true,
      locations: result.rows
    });
  } catch (error: any) {
    console.error('Failed to get locations:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get locations' },
      { status: 500 }
    );
  }
}

