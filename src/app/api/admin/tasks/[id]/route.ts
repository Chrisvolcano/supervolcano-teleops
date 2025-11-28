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
    console.log('═══════════════════════════════════════');
    console.log(`🗑️  DELETING TASK: ${taskId}`);
    console.log('═══════════════════════════════════════');
    
    // STEP 1: Delete from Firestore FIRST (source of truth)
    console.log('Step 1: Deleting from Firestore...');
    const taskRef = adminDb.collection('tasks').doc(taskId);
    
    // Check if task exists first
    const taskDoc = await taskRef.get();
    let taskExisted = false;
    if (!taskDoc.exists) {
      console.warn(`⚠️  Task ${taskId} not found in Firestore`);
    } else {
      taskExisted = true;
      await taskRef.delete();
      console.log('✅ Deleted task from Firestore');
    }
    
    // STEP 2: Delete associated media from Firestore
    console.log('Step 2: Deleting media from Firestore...');
    const mediaQuery = adminDb.collection('media').where('taskId', '==', taskId);
    const mediaSnapshot = await mediaQuery.get();
    
    console.log(`Found ${mediaSnapshot.size} media items to delete`);
    
    const mediaDeletePromises = mediaSnapshot.docs.map(doc => {
      console.log(`  Deleting media: ${doc.id}`);
      return doc.ref.delete();
    });
    
    await Promise.all(mediaDeletePromises);
    console.log(`✅ Deleted ${mediaSnapshot.size} media items from Firestore`);
    
    // STEP 3: Delete from SQL database
    console.log('Step 3: Deleting from SQL...');
    
    let sqlMediaDeleted = false;
    let sqlJobDeleted = false;
    
    // Delete media from SQL
    try {
      const mediaDeleteResult = await sql`DELETE FROM media WHERE job_id = ${taskId}`;
      sqlMediaDeleted = true;
      const deletedCount = Array.isArray(mediaDeleteResult) 
        ? mediaDeleteResult.length 
        : (mediaDeleteResult as any)?.rowCount || 0;
      console.log(`✅ Deleted media from SQL (${deletedCount} rows)`);
    } catch (mediaError: any) {
      console.warn('⚠️ Could not delete media from SQL:', mediaError.message);
    }
    
    // Delete job from SQL
    try {
      const jobDeleteResult = await sql`DELETE FROM jobs WHERE id = ${taskId}`;
      sqlJobDeleted = true;
      const deletedCount = Array.isArray(jobDeleteResult)
        ? jobDeleteResult.length
        : (jobDeleteResult as any)?.rowCount || 0;
      console.log(`✅ Deleted job from SQL (${deletedCount} rows)`);
    } catch (jobError: any) {
      console.warn('⚠️ Could not delete job from SQL:', jobError.message);
    }
    
    console.log('═══════════════════════════════════════');
    console.log(`✅ TASK ${taskId} DELETION COMPLETE`);
    console.log('═══════════════════════════════════════');
    
    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully from both Firestore and SQL',
      taskId,
      deleted: {
        firestore: {
          task: taskExisted,
          media: mediaSnapshot.size,
        },
        sql: {
          job: sqlJobDeleted,
          media: sqlMediaDeleted,
        },
      },
    });
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
