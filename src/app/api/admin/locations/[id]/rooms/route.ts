import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/locations/[id]/rooms
 * Create a new room
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
    const { floor_id, room_type_id, custom_name, notes, sort_order } = body;
    
    console.log('Creating room:', { locationId, floor_id, room_type_id, custom_name });
    
    if (!room_type_id) {
      return NextResponse.json(
        { success: false, error: 'room_type_id is required' },
        { status: 400 }
      );
    }
    
    if (!locationId || locationId === 'undefined' || locationId.includes('undefined')) {
      console.error('Invalid locationId:', locationId);
      return NextResponse.json(
        { success: false, error: 'Invalid location ID' },
        { status: 400 }
      );
    }
    
    const result = await sql`
      INSERT INTO location_rooms (
        location_id,
        floor_id,
        room_type_id,
        custom_name,
        notes,
        sort_order
      ) VALUES (
        ${locationId},
        ${floor_id || null},
        ${room_type_id},
        ${custom_name || null},
        ${notes || null},
        ${sort_order || 0}
      )
      RETURNING *
    `;
    
    const room = Array.isArray(result) ? result[0] : (result as any)?.rows?.[0];
    
    console.log('Room created successfully:', room);
    
    return NextResponse.json({
      success: true,
      room,
    });
  } catch (error: any) {
    console.error('Failed to create room - DETAILED ERROR:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      locationId: params.id,
    });
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        details: error.code || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

