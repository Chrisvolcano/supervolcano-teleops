import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { adminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function PATCH(
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
    
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);
    
    const body = await request.json();
    
    // Update SQL
    await sql`
      UPDATE tasks SET
        title = ${body.title},
        description = ${body.description || null},
        category = ${body.category || null},
        estimated_duration_minutes = ${body.estimatedDurationMinutes || null},
        priority = ${body.priority || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${params.id}
    `;
    
    // Get location ID from task
    const taskResult = await sql`
      SELECT location_id FROM tasks WHERE id = ${params.id}
    `;
    
    if (taskResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }
    
    const locationId = taskResult.rows[0].location_id;
    
    // Update Firestore
    const taskRef = adminDb
      .collection('locations')
      .doc(locationId)
      .collection('tasks')
      .doc(params.id);
    
    await taskRef.update({
      title: body.title,
      description: body.description || '',
      category: body.category || '',
      estimatedDuration: body.estimatedDurationMinutes || null,
      priority: body.priority || null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update task:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update task' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);
    
    // Get location ID from task
    const taskResult = await sql`
      SELECT location_id FROM tasks WHERE id = ${params.id}
    `;
    
    if (taskResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }
    
    const locationId = taskResult.rows[0].location_id;
    
    // Delete from SQL (cascades to moments/media via foreign keys)
    await sql`DELETE FROM tasks WHERE id = ${params.id}`;
    
    // Delete from Firestore
    const taskRef = adminDb
      .collection('locations')
      .doc(locationId)
      .collection('tasks')
      .doc(params.id);
    
    await taskRef.delete();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete task:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete task' },
      { status: 500 }
    );
  }
}

