import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import { sql } from '@/lib/db/postgres';

export const dynamic = 'force-dynamic';

/**
 * Delete a task from Firestore (and optionally SQL)
 */
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
    
    // Only allow superadmin, admin, and partner_admin
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);
    
    const taskId = params.id;
    console.log('Deleting task:', taskId);
    
    // Delete from Firestore
    await adminDb.collection('tasks').doc(taskId).delete();
    
    console.log('Task deleted from Firestore successfully');
    
    // Optional: Also delete from SQL if synced (don't fail if this fails)
    try {
      await sql`DELETE FROM jobs WHERE id = ${taskId}`;
      console.log('Task also deleted from SQL');
    } catch (sqlError: any) {
      console.warn('Failed to delete from SQL (not critical):', sqlError.message);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error: any) {
    console.error('Failed to delete task:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete task' },
      { status: 500 }
    );
  }
}

/**
 * Update a task in Firestore
 */
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
    
    // Only allow superadmin, admin, and partner_admin
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);
    
    const taskId = params.id;
    const updates = await request.json();
    
    console.log('Updating task:', taskId, updates);
    
    // Update in Firestore
    await adminDb.collection('tasks').doc(taskId).update({
      ...updates,
      updatedAt: new Date(),
    });
    
    console.log('Task updated successfully');
    
    // Optional: Auto-sync to SQL (don't fail if this fails)
    try {
      const { syncJobFromRoot } = await import('@/lib/services/sync/firestoreToSql');
      const taskDoc = await adminDb.collection('tasks').doc(taskId).get();
      const taskData = taskDoc.data();
      const locationId = taskData?.locationId || taskData?.propertyId;
      if (locationId) {
        await syncJobFromRoot(taskId, locationId);
        console.log('Task synced to SQL');
      }
    } catch (syncError: any) {
      console.warn('Failed to sync to SQL (not critical):', syncError.message);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Task updated successfully'
    });
  } catch (error: any) {
    console.error('Failed to update task:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update task' },
      { status: 500 }
    );
  }
}
