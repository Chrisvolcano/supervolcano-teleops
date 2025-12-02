import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';

export const dynamic = 'force-dynamic';

/**
 * Get Location Details with Full Task Hierarchy
 * GET /api/robot/locations/{id}
 * 
 * Returns: location info + rooms → targets → actions hierarchy
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check
    const apiKey = request.headers.get('X-Robot-API-Key');
    if (!apiKey || apiKey !== process.env.ROBOT_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    const locationId = params.id;

    // Get location
    const locationResult = await sql.query(
      `SELECT id, name, address, city, state, zip, partner_org_id, created_at
       FROM locations WHERE id = $1`,
      [locationId]
    );

    if (locationResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      );
    }

    const location = locationResult.rows[0];

    // Get rooms with their types
    const roomsResult = await sql.query(
      `SELECT 
        lr.id,
        lr.custom_name,
        lr.notes,
        lr.sort_order,
        lr.floor_id,
        rt.name as room_type,
        lf.name as floor_name
       FROM location_rooms lr
       LEFT JOIN room_types rt ON lr.room_type_id = rt.id
       LEFT JOIN location_floors lf ON lr.floor_id = lf.id
       WHERE lr.location_id = $1
       ORDER BY lf.sort_order, lr.sort_order`,
      [locationId]
    );

    // Get targets for all rooms
    const roomIds = roomsResult.rows.map((r: any) => r.id);
    let targetsResult = { rows: [] as any[] };
    
    if (roomIds.length > 0) {
      targetsResult = await sql.query(
        `SELECT 
          lt.id,
          lt.room_id,
          lt.custom_name,
          lt.notes,
          lt.sort_order,
          tt.name as target_type
         FROM location_targets lt
         LEFT JOIN target_types tt ON lt.target_type_id = tt.id
         WHERE lt.room_id = ANY($1)
         ORDER BY lt.sort_order`,
        [roomIds]
      );
    }

    // Get actions for all targets
    const targetIds = targetsResult.rows.map((t: any) => t.id);
    let actionsResult = { rows: [] as any[] };
    
    if (targetIds.length > 0) {
      actionsResult = await sql.query(
        `SELECT 
          ta.id,
          ta.target_id,
          ta.custom_instructions,
          ta.custom_duration_minutes,
          ta.sort_order,
          at.name as action_type,
          at.default_duration_minutes
         FROM target_actions ta
         LEFT JOIN action_types at ON ta.action_type_id = at.id
         WHERE ta.target_id = ANY($1)
         ORDER BY ta.sort_order`,
        [targetIds]
      );
    }

    // Build hierarchy
    const actionsMap = new Map<string, any[]>();
    for (const action of actionsResult.rows) {
      const targetId = action.target_id;
      if (!actionsMap.has(targetId)) {
        actionsMap.set(targetId, []);
      }
      actionsMap.get(targetId)!.push({
        id: action.id,
        action_type: action.action_type,
        instructions: action.custom_instructions,
        duration_minutes: action.custom_duration_minutes || action.default_duration_minutes,
        sort_order: action.sort_order,
      });
    }

    const targetsMap = new Map<string, any[]>();
    for (const target of targetsResult.rows) {
      const roomId = target.room_id;
      if (!targetsMap.has(roomId)) {
        targetsMap.set(roomId, []);
      }
      targetsMap.get(roomId)!.push({
        id: target.id,
        name: target.custom_name || target.target_type,
        target_type: target.target_type,
        notes: target.notes,
        sort_order: target.sort_order,
        actions: actionsMap.get(target.id) || [],
      });
    }

    const rooms = roomsResult.rows.map((room: any) => ({
      id: room.id,
      name: room.custom_name || room.room_type,
      room_type: room.room_type,
      floor: room.floor_name,
      notes: room.notes,
      sort_order: room.sort_order,
      targets: targetsMap.get(room.id) || [],
    }));

    return NextResponse.json({
      success: true,
      location: {
        id: location.id,
        name: location.name,
        address: location.address,
        city: location.city,
        state: location.state,
        zip: location.zip,
        created_at: location.created_at,
      },
      hierarchy: {
        rooms,
        summary: {
          total_rooms: rooms.length,
          total_targets: targetsResult.rows.length,
          total_actions: actionsResult.rows.length,
        },
      },
    });
  } catch (error: any) {
    console.error('Robot location detail API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

