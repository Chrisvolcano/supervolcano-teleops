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
    console.log(`🗑️  Deleting task: ${taskId}`);
    
    try {
      // Delete from Firestore
      console.log('Deleting from Firestore...');
      await adminDb.collection('tasks').doc(taskId).delete();
      console.log('✅ Deleted from Firestore');
      
      // Delete associated media from Firestore
      const mediaSnapshot = await adminDb
        .collection('media')
        .where('taskId', '==', taskId)
        .get();
      
      const mediaDeletePromises = mediaSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(mediaDeletePromises);
      console.log(`✅ Deleted ${mediaSnapshot.size} media items from Firestore`);
      
      // Delete from SQL database
      console.log('Deleting from SQL...');
      
      // Delete media from SQL
      try {
        await sql`DELETE FROM media WHERE job_id = ${taskId}`;
        console.log('✅ Deleted media from SQL');
      } catch (mediaError: any) {
        console.warn('⚠️ Could not delete media from SQL:', mediaError.message);
      }
      
      // Delete job from SQL
      try {
        await sql`DELETE FROM jobs WHERE id = ${taskId}`;
        console.log('✅ Deleted job from SQL');
      } catch (jobError: any) {
        console.warn('⚠️ Could not delete job from SQL:', jobError.message);
      }
      
      console.log(`✅ Task ${taskId} deleted successfully from both databases`);
      
      return NextResponse.json({
        success: true,
        message: 'Task deleted successfully',
        taskId,
      });
    } catch (error: any) {
      console.error('Failed to delete task:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to delete task' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Failed to delete task:', error);
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
      if (taskDoc.exists) {
        const taskData = taskDoc.data();
        const locationId = taskData?.locationId || taskData?.propertyId;
        if (locationId) {
          await syncJobFromRoot(taskId, locationId);
          console.log('Task synced to SQL');
        }
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
