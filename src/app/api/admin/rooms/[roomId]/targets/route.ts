import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/rooms/[roomId]/targets
 * Create a new target in a room
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
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

    const roomId = params.roomId;
    const body = await request.json();
    const { target_type_id, custom_name, notes, sort_order } = body;
    
    if (!target_type_id) {
      return NextResponse.json(
        { success: false, error: 'target_type_id is required' },
        { status: 400 }
      );
    }
    
    const result = await sql`
      INSERT INTO location_targets (
        room_id,
        target_type_id,
        custom_name,
        notes,
        sort_order
      ) VALUES (
        ${roomId},
        ${target_type_id},
        ${custom_name || null},
        ${notes || null},
        ${sort_order || 0}
      )
      RETURNING *
    `;
    
    const target = Array.isArray(result) ? result[0] : (result as any)?.rows?.[0];
    
    return NextResponse.json({
      success: true,
      target,
    });
  } catch (error: any) {
    console.error('Failed to create target:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

