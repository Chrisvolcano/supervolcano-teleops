import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/taxonomy/templates/[templateId]
 * Get a single template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
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

    const templateId = params.templateId;
    
    const result = await sql`
      SELECT 
        t.*,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon
      FROM task_templates t
      LEFT JOIN task_categories c ON t.category_id = c.id
      WHERE t.id = ${templateId}
        AND t.is_active = true
    `;
    
    const template = Array.isArray(result) ? result[0] : (result as any)?.rows?.[0];
    
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error: any) {
    console.error('Failed to fetch template:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/taxonomy/templates/[templateId]
 * Update a template
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { templateId: string } }
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

    const templateId = params.templateId;
    const body = await request.json();
    
    const result = await sql`
      UPDATE task_templates
      SET 
        category_id = COALESCE(${body.category_id || null}, category_id),
        name = COALESCE(${body.name}, name),
        description = COALESCE(${body.description}, description),
        steps = COALESCE(${body.steps ? JSON.stringify(body.steps) : null}::jsonb, steps),
        tools_required = COALESCE(${body.tools_required ? JSON.stringify(body.tools_required) : null}::jsonb, tools_required),
        safety_notes = COALESCE(${body.safety_notes ? JSON.stringify(body.safety_notes) : null}::jsonb, safety_notes),
        instruction_video_url = COALESCE(${body.instruction_video_url}, instruction_video_url),
        instruction_images = COALESCE(${body.instruction_images ? JSON.stringify(body.instruction_images) : null}::jsonb, instruction_images),
        estimated_duration_minutes = COALESCE(${body.estimated_duration_minutes}, estimated_duration_minutes),
        difficulty_level = COALESCE(${body.difficulty_level}, difficulty_level),
        priority = COALESCE(${body.priority}, priority),
        updated_at = NOW()
      WHERE id = ${templateId}
      RETURNING *
    `;
    
    const template = Array.isArray(result) ? result[0] : (result as any)?.rows?.[0];
    
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error: any) {
    console.error('Failed to update template:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/taxonomy/templates/[templateId]
 * Soft delete a template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { templateId: string } }
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

    const templateId = params.templateId;
    
    await sql`
      UPDATE task_templates
      SET is_active = false, updated_at = NOW()
      WHERE id = ${templateId}
    `;
    
    return NextResponse.json({
      success: true,
      message: 'Template deleted',
    });
  } catch (error: any) {
    console.error('Failed to delete template:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

