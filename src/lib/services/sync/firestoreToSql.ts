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
      console.error(`[sync] Location ${locationId} not found in Firestore`);
      return { success: false, error: 'Location not found' };
    }
    
    const location = locationDoc.data();
    console.log(`[sync] Syncing location ${locationId}:`, {
      name: location?.name,
      address: location?.address,
      organizationId: location?.assignedOrganizationId
    });
    
    // Get organization_id - use partnerOrgId as fallback if assignedOrganizationId is missing
    const organizationId = location?.assignedOrganizationId || location?.partnerOrgId || 'unassigned';
    const organizationName = location?.assignedOrganizationName || null;
    
    await sql`
      INSERT INTO locations (
        id, organization_id, organization_name, name, address,
        contact_name, contact_phone, contact_email, access_instructions,
        metadata, synced_at
      ) VALUES (
        ${locationId},
        ${organizationId},
        ${organizationName},
        ${location?.name || 'Unnamed'},
        ${location?.address || null},
        ${location?.contactName || location?.contact_name || location?.primaryContact?.name || null},
        ${location?.contactPhone || location?.contact_phone || location?.primaryContact?.phone || null},
        ${location?.contactEmail || location?.contact_email || location?.primaryContact?.email || null},
        ${location?.accessInstructions || location?.access_instructions || null},
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
    
    console.log(`[sync] Successfully synced location ${locationId}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[sync] Failed to sync location ${locationId}:`, error.message, error.stack);
    return { success: false, error: error.message || 'Sync failed' };
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
    let locationsErrors = 0;
    let tasksSynced = 0;
    let tasksErrors = 0;
    let shiftsSynced = 0;
    let shiftsErrors = 0;
    
    // Sync locations
    console.log('Syncing locations...');
    const locationsSnapshot = await adminDb.collection('locations').get();
    console.log(`Found ${locationsSnapshot.docs.length} locations in Firestore`);
    
    for (const doc of locationsSnapshot.docs) {
      try {
        const result = await syncLocation(doc.id);
        if (result.success) {
          locationsSynced++;
        } else {
          locationsErrors++;
          console.error(`Failed to sync location ${doc.id}:`, result.error);
        }
      } catch (error: any) {
        locationsErrors++;
        console.error(`Error syncing location ${doc.id}:`, error.message);
      }
    }
    
    // Sync tasks (from location subcollections)
    console.log('Syncing tasks...');
    const locationsForTasks = await adminDb.collection('locations').get();
    console.log(`Checking ${locationsForTasks.docs.length} locations for tasks`);
    
    for (const locDoc of locationsForTasks.docs) {
      try {
        const tasksSnapshot = await locDoc.ref.collection('tasks').get();
        console.log(`Location ${locDoc.id} has ${tasksSnapshot.docs.length} tasks`);
        
        for (const taskDoc of tasksSnapshot.docs) {
          try {
            const result = await syncTask(locDoc.id, taskDoc.id);
            if (result.success) {
              tasksSynced++;
            } else {
              tasksErrors++;
              console.error(`Failed to sync task ${taskDoc.id}:`, result.error);
            }
          } catch (error: any) {
            tasksErrors++;
            console.error(`Error syncing task ${taskDoc.id}:`, error.message);
          }
        }
      } catch (error: any) {
        console.error(`Error accessing tasks for location ${locDoc.id}:`, error.message);
      }
    }
    
    // Sync sessions
    console.log('Syncing shifts (sessions)...');
    const sessionsSnapshot = await adminDb.collection('sessions').get();
    console.log(`Found ${sessionsSnapshot.docs.length} sessions in Firestore`);
    
    for (const doc of sessionsSnapshot.docs) {
      try {
        const result = await syncShift(doc.id);
        if (result.success) {
          shiftsSynced++;
        } else {
          shiftsErrors++;
          console.error(`Failed to sync shift ${doc.id}:`, result.error);
        }
      } catch (error: any) {
        shiftsErrors++;
        console.error(`Error syncing shift ${doc.id}:`, error.message);
      }
    }
    
    console.log('Sync complete:', {
      locations: { synced: locationsSynced, errors: locationsErrors },
      tasks: { synced: tasksSynced, errors: tasksErrors },
      shifts: { synced: shiftsSynced, errors: shiftsErrors },
    });
    
    return { 
      success: true, 
      message: 'All data synced',
      stats: {
        locations: locationsSynced,
        tasks: tasksSynced,
        shifts: shiftsSynced,
        errors: {
          locations: locationsErrors,
          tasks: tasksErrors,
          shifts: shiftsErrors,
        }
      }
    };
  } catch (error: any) {
    console.error('Failed to sync all data:', error);
    return { 
      success: false, 
      error: error.message || 'Sync failed',
      details: error.stack
    };
  }
}

