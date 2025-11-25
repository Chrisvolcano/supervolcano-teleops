import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/taxonomy/categories/[categoryId]
 * Update a category
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { categoryId: string } }
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

    const categoryId = params.categoryId;
    const body = await request.json();
    const { name, description, icon, color, sort_order } = body;
    
    const result = await sql`
      UPDATE task_categories
      SET 
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        icon = COALESCE(${icon}, icon),
        color = COALESCE(${color}, color),
        sort_order = COALESCE(${sort_order}, sort_order),
        updated_at = NOW()
      WHERE id = ${categoryId}
      RETURNING *
    `;
    
    const category = Array.isArray(result) ? result[0] : (result as any)?.rows?.[0];
    
    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error: any) {
    console.error('Failed to update category:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/taxonomy/categories/[categoryId]
 * Soft delete a category
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { categoryId: string } }
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

    const categoryId = params.categoryId;
    
    await sql`
      UPDATE task_categories
      SET is_active = false, updated_at = NOW()
      WHERE id = ${categoryId}
    `;
    
    return NextResponse.json({
      success: true,
      message: 'Category deleted',
    });
  } catch (error: any) {
    console.error('Failed to delete category:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

