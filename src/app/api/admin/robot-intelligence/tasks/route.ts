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
    
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);
    
    const searchParams = request.nextUrl.searchParams;
    const locationId = searchParams.get('locationId');
    
    // Query jobs table (high-level assignments)
    let queryText = 'SELECT id, title, location_id, category FROM jobs';
    const params: any[] = [];
    
    if (locationId) {
      queryText += ' WHERE location_id = $1';
      params.push(locationId);
    }
    
    queryText += ' ORDER BY title ASC';
    
    const result = await sql.query(queryText, params);
    
    return NextResponse.json({ success: true, tasks: result.rows }); // Still called "tasks" in response for backward compatibility
  } catch (error: any) {
    console.error('Get tasks error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get tasks' },
      { status: 500 }
    );
  }
}

