import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/locations/[id]/floors/[floorId]/rooms
 * Get all rooms for a specific floor
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; floorId: string } }
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

    const { floorId, id: locationId } = params;
    
    console.log('[GET Rooms] Fetching rooms for floor:', floorId, 'location:', locationId);
    
    if (!floorId || floorId === 'undefined' || floorId.includes('undefined')) {
      return NextResponse.json(
        { success: false, error: 'Invalid floor ID' },
        { status: 400 }
      );
    }
    
    // Fetch rooms with room type info
    const result = await sql`
      SELECT 
        lr.*,
        rt.name as room_type_name,
        rt.icon as room_type_icon,
        rt.color as room_type_color
      FROM location_rooms lr
      LEFT JOIN room_types rt ON lr.room_type_id = rt.id
      WHERE lr.floor_id = ${floorId}
      ORDER BY lr.sort_order ASC, lr.custom_name ASC, rt.name ASC
    `;
    
    const rooms = Array.isArray(result) ? result : (result as any)?.rows || [];
    
    console.log('[GET Rooms] Found rooms:', rooms.length, rooms);
    
    return NextResponse.json({
      success: true,
      rooms,
      count: rooms.length,
    });
  } catch (error: any) {
    console.error('[GET Rooms] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch rooms',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

