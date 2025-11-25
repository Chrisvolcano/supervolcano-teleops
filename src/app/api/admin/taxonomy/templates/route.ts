import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/taxonomy/templates
 * List all templates, optionally filtered by category
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

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    
    let templates;
    
    if (categoryId) {
      templates = await sql`
        SELECT 
          t.*,
          c.name as category_name,
          c.color as category_color
        FROM task_templates t
        LEFT JOIN task_categories c ON t.category_id = c.id
        WHERE t.category_id = ${categoryId}
          AND t.is_active = true
        ORDER BY t.name ASC
      `;
    } else {
      templates = await sql`
        SELECT 
          t.*,
          c.name as category_name,
          c.color as category_color
        FROM task_templates t
        LEFT JOIN task_categories c ON t.category_id = c.id
        WHERE t.is_active = true
        ORDER BY c.sort_order ASC, t.name ASC
      `;
    }
    
    const templatesArray = Array.isArray(templates) ? templates : (templates as any)?.rows || [];
    
    return NextResponse.json({
      success: true,
      templates: templatesArray,
      count: templatesArray.length,
    });
  } catch (error: any) {
    console.error('Failed to fetch templates:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/taxonomy/templates
 * Create a new template
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
    const {
      category_id,
      name,
      description,
      steps,
      tools_required,
      safety_notes,
      instruction_video_url,
      instruction_images,
      estimated_duration_minutes,
      difficulty_level,
      priority,
    } = body;
    
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }
    
    // Validate steps format if provided
    if (steps && !Array.isArray(steps)) {
      return NextResponse.json(
        { success: false, error: 'Steps must be an array' },
        { status: 400 }
      );
    }
    
    const result = await sql`
      INSERT INTO task_templates (
        category_id,
        name,
        description,
        steps,
        tools_required,
        safety_notes,
        instruction_video_url,
        instruction_images,
        estimated_duration_minutes,
        difficulty_level,
        priority
      ) VALUES (
        ${category_id || null},
        ${name},
        ${description || null},
        ${steps ? JSON.stringify(steps) : null}::jsonb,
        ${tools_required ? JSON.stringify(tools_required) : null}::jsonb,
        ${safety_notes ? JSON.stringify(safety_notes) : null}::jsonb,
        ${instruction_video_url || null},
        ${instruction_images ? JSON.stringify(instruction_images) : null}::jsonb,
        ${estimated_duration_minutes || 15},
        ${difficulty_level || 'medium'},
        ${priority || 'medium'}
      )
      RETURNING *
    `;
    
    const template = Array.isArray(result) ? result[0] : (result as any)?.rows?.[0];
    
    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error: any) {
    console.error('Failed to create template:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

