import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/library/room-types
 * List all room types in the base library
 */
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
    
    requireRole(claims, ['superadmin', 'admin']);

    const roomTypes = await sql`
      SELECT * FROM room_types
      WHERE is_active = true
      ORDER BY sort_order ASC, name ASC
    `;
    
    const roomTypesArray = Array.isArray(roomTypes) ? roomTypes : (roomTypes as any)?.rows || [];
    
    return NextResponse.json({
      success: true,
      roomTypes: roomTypesArray,
      count: roomTypesArray.length,
    });
  } catch (error: any) {
    console.error('Failed to fetch room types:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/library/room-types
 * Create a new room type
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name, description, icon, color, default_targets } = body;
    
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }
    
    const result = await sql`
      INSERT INTO room_types (name, description, icon, color, default_targets)
      VALUES (
        ${name},
        ${description || null},
        ${icon || null},
        ${color || '#3B82F6'},
        ${default_targets ? JSON.stringify(default_targets) : null}::jsonb
      )
      RETURNING *
    `;
    
    const roomType = Array.isArray(result) ? result[0] : (result as any)?.rows?.[0];
    
    return NextResponse.json({
      success: true,
      roomType,
    });
  } catch (error: any) {
    console.error('Failed to create room type:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

