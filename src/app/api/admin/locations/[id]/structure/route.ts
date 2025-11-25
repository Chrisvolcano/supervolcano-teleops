import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/locations/[id]/structure
 * Get the complete structure of a location (floors, rooms, targets, actions)
 */
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
    
    requireRole(claims, ['superadmin', 'admin']);

    const locationId = params.id;
    
    // Get floors
    const floorsResult = await sql`
      SELECT * FROM location_floors
      WHERE location_id = ${locationId}
      ORDER BY sort_order ASC
    `;
    
    const floors = Array.isArray(floorsResult) ? floorsResult : (floorsResult as any)?.rows || [];
    
    // Get rooms with room type info
    const roomsResult = await sql`
      SELECT 
        lr.*,
        rt.name as room_type_name,
        rt.icon as room_type_icon,
        rt.color as room_type_color
      FROM location_rooms lr
      LEFT JOIN room_types rt ON lr.room_type_id = rt.id
      WHERE lr.location_id = ${locationId}
      ORDER BY lr.sort_order ASC
    `;
    
    const rooms = Array.isArray(roomsResult) ? roomsResult : (roomsResult as any)?.rows || [];
    
    if (rooms.length === 0) {
      return NextResponse.json({
        success: true,
        structure: {
          floors: [],
          roomsWithoutFloors: [],
        },
        stats: {
          floorCount: floors.length,
          roomCount: 0,
          targetCount: 0,
          actionCount: 0,
        },
      });
    }
    
    // Get targets with target type info
    const targetsResult = await sql`
      SELECT 
        lt.*,
        tt.name as target_type_name,
        tt.icon as target_type_icon
      FROM location_targets lt
      LEFT JOIN target_types tt ON lt.target_type_id = tt.id
      WHERE lt.room_id = ANY(${rooms.map((r: any) => r.id)}::uuid[])
      ORDER BY lt.sort_order ASC
    `;
    
    const targets = Array.isArray(targetsResult) ? targetsResult : (targetsResult as any)?.rows || [];
    
    if (targets.length === 0) {
      // Build structure without targets
      const structure = floors.map((floor: any) => ({
        ...floor,
        rooms: rooms
          .filter((r: any) => r.floor_id === floor.id)
          .map((room: any) => ({
            ...room,
            targets: [],
          })),
      }));
      
      const roomsWithoutFloors = rooms
        .filter((r: any) => !r.floor_id)
        .map((room: any) => ({
          ...room,
          targets: [],
        }));
      
      return NextResponse.json({
        success: true,
        structure: {
          floors: structure,
          roomsWithoutFloors,
        },
        stats: {
          floorCount: floors.length,
          roomCount: rooms.length,
          targetCount: 0,
          actionCount: 0,
        },
      });
    }
    
    // Get actions with action type info
    const actionsResult = await sql`
      SELECT 
        ta.*,
        at.name as action_type_name,
        at.estimated_duration_minutes as default_duration,
        at.tools_required,
        at.instructions as default_instructions
      FROM target_actions ta
      LEFT JOIN action_types at ON ta.action_type_id = at.id
      WHERE ta.target_id = ANY(${targets.map((t: any) => t.id)}::uuid[])
      ORDER BY ta.sort_order ASC
    `;
    
    const actions = Array.isArray(actionsResult) ? actionsResult : (actionsResult as any)?.rows || [];
    
    // Build hierarchical structure
    const structure = floors.map((floor: any) => ({
      ...floor,
      rooms: rooms
        .filter((r: any) => r.floor_id === floor.id)
        .map((room: any) => ({
          ...room,
          targets: targets
            .filter((t: any) => t.room_id === room.id)
            .map((target: any) => ({
              ...target,
              actions: actions.filter((a: any) => a.target_id === target.id),
            })),
        })),
    }));
    
    // Rooms without floors
    const roomsWithoutFloors = rooms
      .filter((r: any) => !r.floor_id)
      .map((room: any) => ({
        ...room,
        targets: targets
          .filter((t: any) => t.room_id === room.id)
          .map((target: any) => ({
            ...target,
            actions: actions.filter((a: any) => a.target_id === target.id),
          })),
      }));
    
    return NextResponse.json({
      success: true,
      structure: {
        floors: structure,
        roomsWithoutFloors,
      },
      stats: {
        floorCount: floors.length,
        roomCount: rooms.length,
        targetCount: targets.length,
        actionCount: actions.length,
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch location structure:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

