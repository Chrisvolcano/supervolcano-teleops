import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/locations/[id]/floors
 * Get all floors for a location
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
    
    console.log('[GET Floors] Fetching floors for location:', locationId);
    
    if (!locationId || locationId === 'undefined' || locationId.includes('undefined')) {
      console.error('[GET Floors] Invalid locationId:', locationId);
      return NextResponse.json(
        { success: false, error: 'Invalid location ID' },
        { status: 400 }
      );
    }
    
    const result = await sql`
      SELECT * FROM location_floors
      WHERE location_id = ${locationId}
      ORDER BY sort_order ASC, name ASC
    `;
    
    const floors = Array.isArray(result) ? result : (result as any)?.rows || [];
    
    console.log('[GET Floors] Found floors:', floors.length, floors);
    
    return NextResponse.json({
      success: true,
      floors,
      count: floors.length,
    });
  } catch (error: any) {
    console.error('Failed to fetch floors:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch floors',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

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
    
    console.log('Creating floor:', { locationId, name, sort_order });
    
    // Validate input
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Floor name is required' },
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
    
    // Normalize floor name - trim whitespace
    const trimmedName = name.trim();
    
    // Check for duplicate floor name (case-insensitive comparison)
    const existingFloors = await sql`
      SELECT id, name FROM location_floors
      WHERE location_id = ${locationId}
    `;
    
    const floors = Array.isArray(existingFloors) ? existingFloors : (existingFloors as any)?.rows || [];
    
    // Check if normalized name already exists (case-insensitive)
    const isDuplicate = floors.some((floor: any) => 
      floor.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (isDuplicate) {
      return NextResponse.json(
        { 
          success: false,
          error: 'A floor with this name already exists in this location',
          details: 'Floor names must be unique within each location (case-insensitive)'
        },
        { status: 409 } // Conflict
      );
    }
    
    // Auto-calculate sort_order if not provided
    const floorNum = sort_order !== undefined ? sort_order : floors.length;
    
    // Create the floor
    const result = await sql`
      INSERT INTO location_floors (location_id, name, sort_order)
      VALUES (${locationId}, ${trimmedName}, ${floorNum})
      RETURNING *
    `;
    
    const floor = Array.isArray(result) ? result[0] : (result as any)?.rows?.[0];
    
    console.log('Floor created successfully:', floor);
    
    return NextResponse.json({
      success: true,
      floor,
    });
  } catch (error: any) {
    console.error('Failed to create floor - DETAILED ERROR:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      locationId: params.id,
    });
    
    // Handle specific PostgreSQL constraint violation
    if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'A floor with this name already exists in this location',
          details: 'Floor names must be unique within each location'
        },
        { status: 409 } // Conflict
      );
    }
    
    // Handle permission errors
    if (error.code === 'permission-denied' || error.message?.includes('permission')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create floor',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

