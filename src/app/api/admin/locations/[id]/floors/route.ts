import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/locations/[id]/floors
 * Create a new floor
 */
export async function POST(
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
    
    requireRole(claims, ['superadmin', 'admin']);

    const locationId = params.id;
    const body = await request.json();
    const { name, sort_order } = body;
    
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }
    
    const result = await sql`
      INSERT INTO location_floors (location_id, name, sort_order)
      VALUES (${locationId}, ${name}, ${sort_order || 0})
      RETURNING *
    `;
    
    const floor = Array.isArray(result) ? result[0] : (result as any)?.rows?.[0];
    
    return NextResponse.json({
      success: true,
      floor,
    });
  } catch (error: any) {
    console.error('Failed to create floor:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

