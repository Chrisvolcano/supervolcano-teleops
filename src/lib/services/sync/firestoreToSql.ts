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
 * Sync job from Firestore to SQL
 * Note: Jobs are stored in location subcollections in Firestore as "tasks"
 * After migration: Firestore "tasks" → SQL "jobs" (high-level assignments)
 */
export async function syncJob(locationId: string, jobId: string) {
  try {
    const jobDoc = await adminDb
      .collection('locations')
      .doc(locationId)
      .collection('tasks')
      .doc(jobId)
      .get();
    
    if (!jobDoc.exists) {
      return { success: false, error: 'Job not found' };
    }
    
    const job = jobDoc.data();
    
    await sql`
      INSERT INTO jobs (
        id, location_id, title, description, category,
        estimated_duration_minutes, priority, metadata, synced_at
      ) VALUES (
        ${jobId},
        ${locationId},
        ${job?.title || 'Unnamed Job'},
        ${job?.description || null},
        ${job?.category || null},
        ${job?.estimatedDuration || null},
        ${job?.priority || null},
        ${JSON.stringify(job)},
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
    console.error('Failed to sync job:', error);
    return { success: false, error: 'Sync failed' };
  }
}

/**
 * Sync media from Firestore to SQL
 */
export async function syncMedia(mediaId: string) {
  try {
    const mediaDoc = await adminDb.collection('media').doc(mediaId).get();
    
    if (!mediaDoc.exists) {
      console.error(`[sync] Media ${mediaId} not found in Firestore`);
      return { success: false, error: 'Media not found' };
    }
    
    const media = mediaDoc.data();
    
    if (!media) {
      console.error(`[sync] Media ${mediaId} data is empty`);
      return { success: false, error: 'Media data is empty' };
    }
    
    console.log(`[sync] Syncing media ${mediaId}: ${media.fileName || 'unnamed'}`);
    console.log(`[sync]   - Location: ${media.locationId}`);
    console.log(`[sync]   - Job: ${media.taskId || 'none'}`);
    console.log(`[sync]   - Type: ${media.mediaType || 'unknown'}`);
    console.log(`[sync]   - URL: ${media.storageUrl ? 'present' : 'missing'}`);
    
    // Get organization_id from location (must exist in SQL first)
    const orgResult = await sql`
      SELECT organization_id FROM locations WHERE id = ${media.locationId} LIMIT 1
    `;
    
    if (orgResult.rows.length === 0) {
      console.error(`[sync] Location ${media.locationId} not found in SQL for media ${mediaId}`);
      return { success: false, error: 'Location not found in SQL - sync locations first' };
    }
    
    const organizationId = orgResult.rows[0].organization_id;
    console.log(`[sync]   - Organization: ${organizationId}`);
    
    // Handle Firestore Timestamp conversion
    const uploadedAt = media.uploadedAt?.toDate 
      ? media.uploadedAt.toDate() 
      : (media.uploadedAt ? new Date(media.uploadedAt) : new Date());
    
    await sql`
      INSERT INTO media (
        id, organization_id, location_id, job_id, shift_id,
        media_type, storage_url, thumbnail_url,
        duration_seconds, resolution, fps,
        processing_status, ai_processed, moments_extracted,
        uploaded_by, uploaded_at, tags, synced_at
      ) VALUES (
        ${mediaId},
        ${organizationId},
        ${media.locationId || null},
        ${media.taskId || null},
        ${media.shiftId || null},
        ${media.mediaType || 'video'},
        ${media.storageUrl || ''},
        ${media.thumbnailUrl || null},
        ${media.durationSeconds || null},
        ${media.resolution || null},
        ${media.fps || null},
        ${media.processingStatus || 'completed'},
        ${media.aiProcessed || false},
        ${media.momentsExtracted || 0},
        ${media.uploadedBy || 'admin'},
        ${uploadedAt},
        ${media.tags || []},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        location_id = EXCLUDED.location_id,
        job_id = EXCLUDED.job_id,
        storage_url = EXCLUDED.storage_url,
        thumbnail_url = EXCLUDED.thumbnail_url,
        processing_status = EXCLUDED.processing_status,
        ai_processed = EXCLUDED.ai_processed,
        moments_extracted = EXCLUDED.moments_extracted,
        synced_at = NOW()
    `;
    
    console.log(`[sync] ✓ Successfully synced media ${mediaId}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[sync] ✗ Failed to sync media ${mediaId}:`, error.message);
    console.error(`[sync]   Error details:`, error.stack);
    return { success: false, error: error.message || 'Sync failed' };
  }
}

/**
 * After syncing media, automatically link it to any tasks for the same job
 */
export async function autoLinkMediaToTasks(jobId: string) {
  try {
    // Get all media for this job from SQL
    const mediaResult = await sql`
      SELECT id FROM media WHERE job_id = ${jobId}
    `;
    
    // Get all tasks for this job from SQL
    const tasksResult = await sql`
      SELECT id FROM tasks WHERE job_id = ${jobId}
    `;
    
    // Link each media to each task (visual reference for the entire job)
    let linksCreated = 0;
    for (const media of mediaResult.rows) {
      for (const task of tasksResult.rows) {
        await sql`
          INSERT INTO task_media (task_id, media_id, media_role)
          VALUES (${task.id}, ${media.id}, 'job_reference')
          ON CONFLICT (task_id, media_id) DO NOTHING
        `;
        linksCreated++;
      }
    }
    
    console.log(`Auto-linked ${linksCreated} media-task relationships for job ${jobId}`);
    return { success: true, linksCreated };
  } catch (error) {
    console.error('Failed to auto-link media:', error);
    return { success: false, error: 'Auto-link failed' };
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
    
    // Sync jobs (from location subcollections - Firestore "tasks" → SQL "jobs")
    console.log('Syncing jobs...');
    const locationsForJobs = await adminDb.collection('locations').get();
    console.log(`Checking ${locationsForJobs.docs.length} locations for jobs`);
    
    for (const locDoc of locationsForJobs.docs) {
      try {
        const jobsSnapshot = await locDoc.ref.collection('tasks').get();
        console.log(`Location ${locDoc.id} has ${jobsSnapshot.docs.length} jobs`);
        
        for (const jobDoc of jobsSnapshot.docs) {
          try {
            const result = await syncJob(locDoc.id, jobDoc.id);
            if (result.success) {
              tasksSynced++;
            } else {
              tasksErrors++;
              console.error(`Failed to sync job ${jobDoc.id}:`, result.error);
            }
          } catch (error: any) {
            tasksErrors++;
            console.error(`Error syncing job ${jobDoc.id}:`, error.message);
          }
        }
      } catch (error: any) {
        console.error(`Error accessing jobs for location ${locDoc.id}:`, error.message);
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
    
    // Sync media (CRITICAL FOR VISUAL DATABASE)
    console.log('\n[4/4] Syncing media files...');
    const mediaSnapshot = await adminDb.collection('media').get();
    console.log(`Found ${mediaSnapshot.docs.length} media files in Firestore`);
    
    let mediaSynced = 0;
    let mediaErrors = 0;
    const mediaErrorDetails: string[] = [];
    
    for (const doc of mediaSnapshot.docs) {
      try {
        const result = await syncMedia(doc.id);
        if (result.success) {
          mediaSynced++;
        } else {
          mediaErrors++;
          const errorMsg = `Media ${doc.id}: ${result.error}`;
          console.error(`  ✗ ${errorMsg}`);
          mediaErrorDetails.push(errorMsg);
        }
      } catch (error: any) {
        mediaErrors++;
        const errorMsg = `Media ${doc.id}: ${error.message}`;
        console.error(`  ✗ ${errorMsg}`);
        mediaErrorDetails.push(errorMsg);
      }
    }
    
    console.log(`✓ Synced ${mediaSynced}/${mediaSnapshot.docs.length} media files`);
    if (mediaErrors > 0) {
      console.log(`  ⚠ ${mediaErrors} media files failed to sync`);
    }
    
    // Auto-link media to tasks
    console.log('Auto-linking media to tasks...');
    const jobsWithMedia = await sql`
      SELECT DISTINCT job_id FROM media WHERE job_id IS NOT NULL
    `;
    
    let totalLinks = 0;
    for (const row of jobsWithMedia.rows) {
      try {
        const result = await autoLinkMediaToTasks(row.job_id);
        if (result.success) {
          totalLinks += result.linksCreated || 0;
        }
      } catch (error: any) {
        console.error(`Error auto-linking media for job ${row.job_id}:`, error.message);
      }
    }
    console.log(`Created ${totalLinks} media-task links`);
    
    console.log('\n========================================');
    console.log('SYNC COMPLETE');
    console.log('========================================');
    console.log(`Locations: ${locationsSynced} synced, ${locationsErrors} errors`);
    console.log(`Jobs: ${tasksSynced} synced, ${tasksErrors} errors`);
    console.log(`Sessions: ${shiftsSynced} synced, ${shiftsErrors} errors`);
    console.log(`Media: ${mediaSynced} synced, ${mediaErrors} errors`);
    console.log(`Media-Task Links: ${totalLinks} created`);
    
    if (mediaErrorDetails.length > 0) {
      console.log('\nMedia sync errors:');
      mediaErrorDetails.forEach(err => console.log(`  - ${err}`));
    }
    
    const message = `Synced ${locationsSynced} locations, ${tasksSynced} jobs, ${shiftsSynced} sessions, ${mediaSynced} media files`;
    
    return { 
      success: true, 
      message,
      counts: {
        locations: locationsSynced,
        jobs: tasksSynced,
        tasks: tasksSynced, // Alias for backward compatibility
        sessions: shiftsSynced,
        shifts: shiftsSynced, // Alias for backward compatibility
        media: mediaSynced,
        mediaTaskLinks: totalLinks,
      },
      errors: {
        locations: locationsErrors,
        jobs: tasksErrors,
        tasks: tasksErrors,
        sessions: shiftsErrors,
        shifts: shiftsErrors,
        media: mediaErrors,
      },
      errorDetails: {
        media: mediaErrorDetails,
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

