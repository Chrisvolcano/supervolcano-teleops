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
    
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);
    
    const result = await sql`
      SELECT id, name, organization_id, organization_name
      FROM locations
      ORDER BY name ASC
    `;
    
    return NextResponse.json({ success: true, locations: result.rows });
  } catch (error: any) {
    console.error('Get locations error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get locations' },
      { status: 500 }
    );
  }
}

