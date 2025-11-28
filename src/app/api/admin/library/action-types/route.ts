import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/library/action-types
 * List all action types in the base library
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

    const actionTypes = await sql`
      SELECT * FROM action_types
      WHERE is_active = true
      ORDER BY name ASC
    `;
    
    const actionTypesArray = Array.isArray(actionTypes) ? actionTypes : (actionTypes as any)?.rows || [];
    
    return NextResponse.json({
      success: true,
      actionTypes: actionTypesArray,
      count: actionTypesArray.length,
    });
  } catch (error: any) {
    console.error('Failed to fetch action types:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/library/action-types
 * Create a new action type
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
    const { name, description, estimated_duration_minutes, tools_required, instructions } = body;
    
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }
    
    const result = await sql`
      INSERT INTO action_types (name, description, estimated_duration_minutes, tools_required, instructions)
      VALUES (
        ${name},
        ${description || null},
        ${estimated_duration_minutes || 5},
        ${tools_required ? JSON.stringify(tools_required) : null}::jsonb,
        ${instructions || null}
      )
      RETURNING *
    `;
    
    const actionType = Array.isArray(result) ? result[0] : (result as any)?.rows?.[0];
    
    return NextResponse.json({
      success: true,
      actionType,
    });
  } catch (error: any) {
    console.error('Failed to create action type:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

