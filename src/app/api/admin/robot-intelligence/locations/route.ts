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
    
    const result = await sql`
      SELECT id, name, organization_id, organization_name
      FROM locations
      ORDER BY name ASC
    `;
    
    // Handle both array and { rows: [...] } response formats
    const rows = Array.isArray(result) ? result : (result as any)?.rows || [];
    
    console.log('[Robot Intelligence] Locations fetched:', rows.length);
    
    return NextResponse.json({ 
      success: true, 
      locations: rows.map((row: any) => ({
        id: row.id,
        name: row.name || row.organization_name || 'Unnamed Location',
        organizationId: row.organization_id,
        organizationName: row.organization_name,
      }))
    });
  } catch (error: any) {
    console.error('[Robot Intelligence] Get locations error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get locations', locations: [] },
      { status: 500 }
    );
  }
}

