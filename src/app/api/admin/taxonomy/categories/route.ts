import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/taxonomy/categories
 * List all task categories
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

    const categories = await sql`
      SELECT 
        id,
        name,
        description,
        icon,
        color,
        sort_order,
        is_active,
        (SELECT COUNT(*)::int FROM task_templates WHERE category_id = task_categories.id AND is_active = true) as template_count
      FROM task_categories
      WHERE is_active = true
      ORDER BY sort_order ASC, name ASC
    `;
    
    return NextResponse.json({
      success: true,
      categories: Array.isArray(categories) ? categories : (categories as any)?.rows || [],
      count: Array.isArray(categories) ? categories.length : (categories as any)?.rows?.length || 0,
    });
  } catch (error: any) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/taxonomy/categories
 * Create a new category
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
    const { name, description, icon, color, sort_order } = body;
    
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }
    
    const result = await sql`
      INSERT INTO task_categories (name, description, icon, color, sort_order)
      VALUES (${name}, ${description || null}, ${icon || null}, ${color || '#3B82F6'}, ${sort_order || 0})
      RETURNING *
    `;
    
    const category = Array.isArray(result) ? result[0] : (result as any)?.rows?.[0];
    
    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error: any) {
    console.error('Failed to create category:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

