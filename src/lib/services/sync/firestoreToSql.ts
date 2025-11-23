'use server'

import { adminDb } from '@/lib/firebaseAdmin';
import { sql } from '@/lib/db/postgres';

/**
 * Sync locations from Firestore to SQL
 */
export async function syncLocation(locationId: string) {
  try {
    const locationDoc = await adminDb.collection('locations').doc(locationId).get();
    
    if (!locationDoc.exists) {
      return { success: false, error: 'Location not found' };
    }
    
    const location = locationDoc.data();
    
    await sql`
      INSERT INTO locations (
        id, organization_id, organization_name, name, address,
        contact_name, contact_phone, contact_email, access_instructions,
        metadata, synced_at
      ) VALUES (
        ${locationId},
        ${location?.assignedOrganizationId || null},
        ${location?.assignedOrganizationName || null},
        ${location?.name || 'Unnamed'},
        ${location?.address || null},
        ${location?.contactName || null},
        ${location?.contactPhone || null},
        ${location?.contactEmail || null},
        ${location?.accessInstructions || null},
        ${JSON.stringify(location)},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        organization_name = EXCLUDED.organization_name,
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        contact_name = EXCLUDED.contact_name,
        contact_phone = EXCLUDED.contact_phone,
        contact_email = EXCLUDED.contact_email,
        access_instructions = EXCLUDED.access_instructions,
        metadata = EXCLUDED.metadata,
        synced_at = NOW()
    `;
    
    return { success: true };
  } catch (error) {
    console.error('Failed to sync location:', error);
    return { success: false, error: 'Sync failed' };
  }
}

/**
 * Sync shift (session) from Firestore to SQL
 */
export async function syncShift(sessionId: string) {
  try {
    const sessionDoc = await adminDb.collection('sessions').doc(sessionId).get();
    
    if (!sessionDoc.exists) {
      return { success: false, error: 'Session not found' };
    }
    
    const session = sessionDoc.data();
    
    // Handle Firestore Timestamp conversion
    const firstTaskStartedAt = session?.firstTaskStartedAt?.toDate 
      ? session.firstTaskStartedAt.toDate() 
      : (session?.firstTaskStartedAt ? new Date(session.firstTaskStartedAt) : null);
    
    const lastTaskCompletedAt = session?.lastTaskCompletedAt?.toDate 
      ? session.lastTaskCompletedAt.toDate() 
      : (session?.lastTaskCompletedAt ? new Date(session.lastTaskCompletedAt) : null);
    
    await sql`
      INSERT INTO shifts (
        id, organization_id, location_id, location_name,
        teleoperator_id, teleoperator_name, shift_date,
        total_tasks, total_duration_minutes,
        first_task_started_at, last_task_completed_at,
        metadata, synced_at
      ) VALUES (
        ${sessionId},
        ${session?.organizationId || null},
        ${session?.locationId || null},
        ${session?.locationName || null},
        ${session?.teleoperatorId || null},
        ${session?.teleoperatorName || null},
        ${session?.date || null},
        ${session?.totalTasks || 0},
        ${session?.totalDuration || 0},
        ${firstTaskStartedAt},
        ${lastTaskCompletedAt},
        ${JSON.stringify(session)},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        total_tasks = EXCLUDED.total_tasks,
        total_duration_minutes = EXCLUDED.total_duration_minutes,
        first_task_started_at = EXCLUDED.first_task_started_at,
        last_task_completed_at = EXCLUDED.last_task_completed_at,
        metadata = EXCLUDED.metadata,
        synced_at = NOW()
    `;
    
    return { success: true };
  } catch (error) {
    console.error('Failed to sync shift:', error);
    return { success: false, error: 'Sync failed' };
  }
}

/**
 * Sync task from Firestore to SQL
 * Note: Tasks are stored in location subcollections in Firestore
 */
export async function syncTask(locationId: string, taskId: string) {
  try {
    const taskDoc = await adminDb
      .collection('locations')
      .doc(locationId)
      .collection('tasks')
      .doc(taskId)
      .get();
    
    if (!taskDoc.exists) {
      return { success: false, error: 'Task not found' };
    }
    
    const task = taskDoc.data();
    
    await sql`
      INSERT INTO tasks (
        id, location_id, title, description, category,
        estimated_duration_minutes, priority, metadata, synced_at
      ) VALUES (
        ${taskId},
        ${locationId},
        ${task?.title || 'Unnamed Task'},
        ${task?.description || null},
        ${task?.category || null},
        ${task?.estimatedDuration || null},
        ${task?.priority || null},
        ${JSON.stringify(task)},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
        priority = EXCLUDED.priority,
        metadata = EXCLUDED.metadata,
        synced_at = NOW()
    `;
    
    return { success: true };
  } catch (error) {
    console.error('Failed to sync task:', error);
    return { success: false, error: 'Sync failed' };
  }
}

/**
 * Batch sync all data (run periodically or on-demand)
 */
export async function syncAllData() {
  try {
    let locationsSynced = 0;
    let tasksSynced = 0;
    let shiftsSynced = 0;
    
    // Sync locations
    console.log('Syncing locations...');
    const locationsSnapshot = await adminDb.collection('locations').get();
    for (const doc of locationsSnapshot.docs) {
      const result = await syncLocation(doc.id);
      if (result.success) locationsSynced++;
    }
    
    // Sync tasks (from location subcollections)
    console.log('Syncing tasks...');
    const locationsForTasks = await adminDb.collection('locations').get();
    for (const locDoc of locationsForTasks.docs) {
      const tasksSnapshot = await locDoc.ref.collection('tasks').get();
      for (const taskDoc of tasksSnapshot.docs) {
        const result = await syncTask(locDoc.id, taskDoc.id);
        if (result.success) tasksSynced++;
      }
    }
    
    // Sync sessions
    console.log('Syncing shifts (sessions)...');
    const sessionsSnapshot = await adminDb.collection('sessions').get();
    for (const doc of sessionsSnapshot.docs) {
      const result = await syncShift(doc.id);
      if (result.success) shiftsSynced++;
    }
    
    return { 
      success: true, 
      message: 'All data synced',
      stats: {
        locations: locationsSynced,
        tasks: tasksSynced,
        shifts: shiftsSynced,
      }
    };
  } catch (error) {
    console.error('Failed to sync all data:', error);
    return { success: false, error: 'Sync failed' };
  }
}

