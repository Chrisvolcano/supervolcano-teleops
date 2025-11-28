import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/targets/[targetId]/actions
 * Add an action to a target
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { targetId: string } }
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

    const targetId = params.targetId;
    const body = await request.json();
    const { action_type_id, custom_instructions, custom_duration_minutes, sort_order } = body;
    
    if (!action_type_id) {
      return NextResponse.json(
        { success: false, error: 'action_type_id is required' },
        { status: 400 }
      );
    }
    
    const result = await sql`
      INSERT INTO target_actions (
        target_id,
        action_type_id,
        custom_instructions,
        custom_duration_minutes,
        sort_order
      ) VALUES (
        ${targetId},
        ${action_type_id},
        ${custom_instructions || null},
        ${custom_duration_minutes || null},
        ${sort_order || 0}
      )
      RETURNING *
    `;
    
    const action = Array.isArray(result) ? result[0] : (result as any)?.rows?.[0];
    
    return NextResponse.json({
      success: true,
      action,
    });
  } catch (error: any) {
    console.error('Failed to create action:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

