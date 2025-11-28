import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/library/target-types
 * List all target types in the base library
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

    const targetTypes = await sql`
      SELECT * FROM target_types
      WHERE is_active = true
      ORDER BY name ASC
    `;
    
    const targetTypesArray = Array.isArray(targetTypes) ? targetTypes : (targetTypes as any)?.rows || [];
    
    return NextResponse.json({
      success: true,
      targetTypes: targetTypesArray,
      count: targetTypesArray.length,
    });
  } catch (error: any) {
    console.error('Failed to fetch target types:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/library/target-types
 * Create a new target type
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
    const { name, description, icon, default_actions } = body;
    
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }
    
    const result = await sql`
      INSERT INTO target_types (name, description, icon, default_actions)
      VALUES (
        ${name},
        ${description || null},
        ${icon || null},
        ${default_actions ? JSON.stringify(default_actions) : null}::jsonb
      )
      RETURNING *
    `;
    
    const targetType = Array.isArray(result) ? result[0] : (result as any)?.rows?.[0];
    
    return NextResponse.json({
      success: true,
      targetType,
    });
  } catch (error: any) {
    console.error('Failed to create target type:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

