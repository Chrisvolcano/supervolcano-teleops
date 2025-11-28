import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { adminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/taxonomy/templates/[templateId]/create-task
 * 
 * Create a new task instance from a template
 * Body: { location_id, custom_steps?, custom_tools?, assigned_to? }
 */
export async function POST(
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
    const { location_id, custom_steps, custom_tools, assigned_to } = body;
    
    if (!location_id) {
      return NextResponse.json(
        { success: false, error: 'location_id is required' },
        { status: 400 }
      );
    }
    
    // Fetch template
    const templateResult = await sql`
      SELECT * FROM task_templates
      WHERE id = ${templateId} AND is_active = true
    `;
    
    const template = Array.isArray(templateResult) ? templateResult[0] : (templateResult as any)?.rows?.[0];
    
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }
    
    // Get location name
    const locationDoc = await adminDb.collection('locations').doc(location_id).get();
    const locationData = locationDoc.data();
    const locationName = locationData?.name || '';
    
    // Get category info
    let categoryName = 'general';
    if (template.category_id) {
      const categoryResult = await sql`
        SELECT name FROM task_categories WHERE id = ${template.category_id}
      `;
      const category = Array.isArray(categoryResult) ? categoryResult[0] : (categoryResult as any)?.rows?.[0];
      if (category) {
        categoryName = category.name.toLowerCase();
      }
    }
    
    // Create task in SQL
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    await sql`
      INSERT INTO jobs (
        id,
        title,
        description,
        category,
        priority,
        location_id,
        location_name,
        estimated_duration_minutes,
        status,
        template_id,
        custom_steps,
        custom_tools
      ) VALUES (
        ${taskId},
        ${template.name},
        ${template.description || ''},
        ${categoryName},
        ${template.priority || 'medium'},
        ${location_id},
        ${locationName},
        ${template.estimated_duration_minutes || 15},
        'available',
        ${templateId},
        ${custom_steps ? JSON.stringify(custom_steps) : null}::jsonb,
        ${custom_tools ? JSON.stringify(custom_tools) : null}::jsonb
      )
    `;
    
    // Create task in Firestore (for backwards compatibility)
    await adminDb.collection('tasks').doc(taskId).set({
      title: template.name,
      description: template.description || '',
      category: categoryName,
      priority: template.priority || 'medium',
      locationId: location_id,
      locationName: locationName,
      estimatedDuration: template.estimated_duration_minutes || 15,
      status: 'available',
      templateId: templateId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    // Increment usage count
    await sql`
      UPDATE task_templates
      SET usage_count = usage_count + 1
      WHERE id = ${templateId}
    `;
    
    console.log(`✅ Created task ${taskId} from template ${templateId}`);
    
    return NextResponse.json({
      success: true,
      taskId,
      message: 'Task created from template',
    });
  } catch (error: any) {
    console.error('Failed to create task from template:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

