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
 * Sync a single job from Firestore root 'tasks' collection to SQL
 * Uses locationId field (new consistent terminology)
 */
export async function syncJobFromRoot(jobId: string, locationId: string) {
  try {
    const jobDoc = await adminDb.collection('tasks').doc(jobId).get();
    
    if (!jobDoc.exists) {
      return { success: false, error: 'Job not found' };
    }
    
    const job = jobDoc.data();
    
    // Use locationId (new) or propertyId (old, during migration)
    const finalLocationId = job?.locationId || job?.propertyId || locationId;
    
    await sql`
      INSERT INTO jobs (
        id, location_id, title, description, category,
        estimated_duration_minutes, priority, metadata, synced_at
      ) VALUES (
        ${jobId},
        ${finalLocationId},
        ${job?.title || job?.name || 'Unnamed Job'},
        ${job?.description || null},
        ${job?.category || null},
        ${job?.estimatedDuration || job?.duration || null},
        ${job?.priority || null},
        ${JSON.stringify(job)},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        location_id = EXCLUDED.location_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
        priority = EXCLUDED.priority,
        metadata = EXCLUDED.metadata,
        synced_at = NOW()
    `;
    
    return { success: true };
  } catch (error: any) {
    console.error('Failed to sync job from root:', error);
    return { success: false, error: error.message || 'Sync failed' };
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
        location_id = EXCLUDED.location_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
        priority = EXCLUDED.priority,
        metadata = EXCLUDED.metadata,
        synced_at = NOW()
    `;
    
    return { success: true };
  } catch (error: any) {
    console.error('Failed to sync job:', error);
    return { success: false, error: error.message || 'Sync failed' };
  }
}

/**
 * Sync media from Firestore to SQL with detailed error logging
 */
export async function syncMedia(mediaId: string) {
  try {
    console.log(`\n[MEDIA SYNC] Starting sync for media: ${mediaId}`);
    
    // 1. Get media from Firestore
    const mediaDoc = await adminDb.collection('media').doc(mediaId).get();
    
    if (!mediaDoc.exists) {
      console.error(`[MEDIA SYNC] ✗ Media ${mediaId} not found in Firestore`);
      return { success: false, error: 'Media not found in Firestore' };
    }
    
    const media = mediaDoc.data();
    
    if (!media) {
      console.error(`[MEDIA SYNC] ✗ Media ${mediaId} data is empty`);
      return { success: false, error: 'Media data is empty' };
    }
    
    console.log(`[MEDIA SYNC] Found media:`, {
      id: mediaId,
      fileName: media.fileName,
      locationId: media.locationId,
      taskId: media.taskId,
      storageUrl: media.storageUrl?.substring(0, 50) + '...',
    });
    
    // 2. Validate required fields
    if (!media.locationId) {
      console.error(`[MEDIA SYNC] ✗ Missing locationId`);
      return { success: false, error: 'Missing locationId' };
    }
    
    if (!media.storageUrl) {
      console.error(`[MEDIA SYNC] ✗ Missing storageUrl`);
      return { success: false, error: 'Missing storageUrl' };
    }
    
    // 3. Check if location exists in SQL
    console.log(`[MEDIA SYNC] Checking if location ${media.locationId} exists in SQL...`);
    const locationCheck = await sql`
      SELECT id, organization_id FROM locations WHERE id = ${media.locationId}
    `;
    
    if (locationCheck.rows.length === 0) {
      console.error(`[MEDIA SYNC] ✗ Location ${media.locationId} not found in SQL`);
      console.error(`[MEDIA SYNC] This location needs to be synced first`);
      return { 
        success: false, 
        error: `Location ${media.locationId} not found in SQL. Sync locations first.` 
      };
    }
    
    const organizationId = locationCheck.rows[0].organization_id;
    console.log(`[MEDIA SYNC] ✓ Location exists, organization: ${organizationId}`);
    
    // 4. Check if job exists in SQL (if taskId is provided)
    let jobId = null;
    if (media.taskId) {
      console.log(`[MEDIA SYNC] Checking if job ${media.taskId} exists in SQL...`);
      const jobCheck = await sql`
        SELECT id FROM jobs WHERE id = ${media.taskId}
      `;
      
      if (jobCheck.rows.length === 0) {
        console.warn(`[MEDIA SYNC] ⚠ Job ${media.taskId} not found in SQL`);
        console.warn(`[MEDIA SYNC] Media will be synced without job reference`);
        // Don't fail - just set jobId to null
        jobId = null;
      } else {
        jobId = media.taskId;
        console.log(`[MEDIA SYNC] ✓ Job exists`);
      }
    }
    
    // 5. Insert/update media in SQL
    // Use simplified INSERT with only essential columns to avoid schema issues
    console.log(`[MEDIA SYNC] Inserting media into SQL...`);
    
    // Handle Firestore Timestamp conversion
    const uploadedAt = media.uploadedAt?.toDate 
      ? media.uploadedAt.toDate() 
      : (media.uploadedAt ? new Date(media.uploadedAt) : new Date());
    
    // Try full insert first, fall back to minimal if schema issues
    try {
      await sql`
        INSERT INTO media (
          id, 
          organization_id, 
          location_id, 
          job_id,
          shift_id,
          media_type, 
          storage_url, 
          thumbnail_url,
          duration_seconds,
          resolution,
          fps,
          processing_status,
          ai_processed,
          moments_extracted,
          uploaded_by, 
          uploaded_at,
          tags
        ) VALUES (
          ${mediaId},
          ${organizationId},
          ${media.locationId},
          ${jobId},
          ${media.shiftId || null},
          ${media.mediaType || 'video'},
          ${media.storageUrl},
          ${media.thumbnailUrl || null},
          ${media.durationSeconds || null},
          ${media.resolution || null},
          ${media.fps || null},
          ${media.processingStatus || 'completed'},
          ${media.aiProcessed || false},
          ${media.momentsExtracted || 0},
          ${media.uploadedBy || 'admin'},
          ${uploadedAt},
          ${media.tags || []}
        )
        ON CONFLICT (id) DO UPDATE SET
          organization_id = EXCLUDED.organization_id,
          location_id = EXCLUDED.location_id,
          job_id = EXCLUDED.job_id,
          storage_url = EXCLUDED.storage_url,
          thumbnail_url = EXCLUDED.thumbnail_url,
          processing_status = EXCLUDED.processing_status,
          ai_processed = EXCLUDED.ai_processed,
          moments_extracted = EXCLUDED.moments_extracted
      `;
    } catch (schemaError: any) {
      // If schema error, try minimal insert (only required columns)
      if (schemaError.message?.includes('column') && schemaError.message?.includes('does not exist')) {
        console.warn(`[MEDIA SYNC] Schema issue detected, using minimal insert`);
        console.warn(`[MEDIA SYNC] Missing column: ${schemaError.message}`);
        
        await sql`
          INSERT INTO media (
            id, 
            organization_id, 
            location_id, 
            job_id,
            media_type, 
            storage_url, 
            uploaded_by, 
            uploaded_at
          ) VALUES (
            ${mediaId},
            ${organizationId},
            ${media.locationId},
            ${jobId},
            ${media.mediaType || 'video'},
            ${media.storageUrl},
            ${media.uploadedBy || 'admin'},
            ${uploadedAt}
          )
          ON CONFLICT (id) DO UPDATE SET
            storage_url = EXCLUDED.storage_url,
            job_id = EXCLUDED.job_id
        `;
        
        console.warn(`[MEDIA SYNC] ⚠ Used minimal insert due to schema issues. Please run migration to add missing columns.`);
      } else {
        throw schemaError; // Re-throw if it's not a schema error
      }
    }
    
    console.log(`[MEDIA SYNC] ✓ Successfully synced media ${mediaId}`);
    return { success: true };
    
  } catch (error: any) {
    console.error(`[MEDIA SYNC] ✗ Failed to sync media ${mediaId}`);
    console.error(`[MEDIA SYNC] Error:`, error.message);
    console.error(`[MEDIA SYNC] Code:`, error.code);
    console.error(`[MEDIA SYNC] Detail:`, error.detail);
    console.error(`[MEDIA SYNC] Stack:`, error.stack);
    
    // Detect schema issues and provide helpful message
    if (error.message?.includes('column') && error.message?.includes('does not exist')) {
      const missingColumn = error.message.match(/column "([^"]+)" of relation "media"/)?.[1];
      console.error(`[MEDIA SYNC] ⚠ SCHEMA ISSUE: Missing column "${missingColumn}"`);
      console.error(`[MEDIA SYNC] Run this in Neon Console:`);
      console.error(`[MEDIA SYNC] ALTER TABLE media ADD COLUMN IF NOT EXISTS ${missingColumn} TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
      
      return { 
        success: false, 
        error: `Schema issue: Missing column "${missingColumn}". See FIX_MEDIA_SCHEMA.md for instructions.`,
        code: error.code,
        detail: error.detail,
        schemaIssue: true,
        missingColumn,
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'Unknown error',
      code: error.code,
      detail: error.detail,
    };
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
    console.log('\n========================================');
    console.log('STARTING FULL SYNC FROM FIRESTORE TO SQL');
    console.log('========================================\n');
    
    const results = {
      locations: { synced: 0, failed: 0 },
      jobs: { synced: 0, failed: 0 },
      sessions: { synced: 0, failed: 0 },
      media: { synced: 0, failed: 0 },
      errors: [] as string[],
    };
    
    // ==========================================
    // STEP 1: Sync ALL locations FIRST
    // ==========================================
    console.log('[STEP 1/4] SYNCING LOCATIONS');
    console.log('==========================================');
    const locationsSnapshot = await adminDb.collection('locations').get();
    console.log(`Found ${locationsSnapshot.size} locations in Firestore\n`);
    
    for (const doc of locationsSnapshot.docs) {
      const result = await syncLocation(doc.id);
      if (result.success) {
        results.locations.synced++;
      } else {
        results.locations.failed++;
        results.errors.push(`Location ${doc.id}: ${result.error}`);
      }
    }
    
    console.log(`\n✓ Locations: ${results.locations.synced}/${locationsSnapshot.size} synced`);
    if (results.locations.failed > 0) {
      console.log(`✗ Locations: ${results.locations.failed} failed`);
    }
    
    // ==========================================
    // STEP 2: Sync ALL jobs (after locations)
    // ==========================================
    console.log('\n[STEP 2/4] SYNCING JOBS');
    console.log('==========================================');
    
    // Try root collection first (new structure with locationId)
    let totalJobs = 0;
    let jobsFromRoot = 0;
    let jobsFromSubcollections = 0;
    
    try {
      // Sync from root 'tasks' collection (uses locationId field)
      const rootTasksSnapshot = await adminDb.collection('tasks').get();
      jobsFromRoot = rootTasksSnapshot.size;
      totalJobs += jobsFromRoot;
      
      console.log(`Found ${jobsFromRoot} jobs in root 'tasks' collection`);
      
      for (const jobDoc of rootTasksSnapshot.docs) {
        const job = jobDoc.data();
        // Use locationId (new) or propertyId (old, during migration)
        const locationId = job.locationId || job.propertyId;
        
        if (!locationId) {
          console.warn(`Job ${jobDoc.id} has no locationId or propertyId, skipping`);
          results.jobs.failed++;
          results.errors.push(`Job ${jobDoc.id}: No locationId/propertyId`);
          continue;
        }
        
        const result = await syncJobFromRoot(jobDoc.id, locationId);
        if (result.success) {
          results.jobs.synced++;
        } else {
          results.jobs.failed++;
          results.errors.push(`Job ${jobDoc.id}: ${result.error}`);
        }
      }
    } catch (error: any) {
      console.warn(`Error syncing from root tasks collection:`, error.message);
    }
    
    // Also try subcollections (old structure, for backward compatibility)
    const locationsForJobs = await adminDb.collection('locations').get();
    for (const locDoc of locationsForJobs.docs) {
      try {
        const jobsSnapshot = await locDoc.ref.collection('tasks').get();
        jobsFromSubcollections += jobsSnapshot.size;
        totalJobs += jobsSnapshot.size;
        for (const jobDoc of jobsSnapshot.docs) {
          const result = await syncJob(locDoc.id, jobDoc.id);
          if (result.success) {
            results.jobs.synced++;
          } else {
            results.jobs.failed++;
            results.errors.push(`Job ${jobDoc.id}: ${result.error}`);
          }
        }
      } catch (error: any) {
        // Subcollection might not exist, that's okay
      }
    }
    
    console.log(`Found ${totalJobs} total jobs (${jobsFromRoot} from root, ${jobsFromSubcollections} from subcollections)\n`);
    console.log(`\n✓ Jobs: ${results.jobs.synced}/${totalJobs} synced`);
    if (results.jobs.failed > 0) {
      console.log(`✗ Jobs: ${results.jobs.failed} failed`);
    }
    
    // ==========================================
    // STEP 3: Sync ALL sessions
    // ==========================================
    console.log('\n[STEP 3/4] SYNCING SESSIONS');
    console.log('==========================================');
    const sessionsSnapshot = await adminDb.collection('sessions').get();
    console.log(`Found ${sessionsSnapshot.size} sessions in Firestore\n`);
    
    for (const doc of sessionsSnapshot.docs) {
      const result = await syncShift(doc.id);
      if (result.success) {
        results.sessions.synced++;
      } else {
        results.sessions.failed++;
        results.errors.push(`Session ${doc.id}: ${result.error}`);
      }
    }
    
    console.log(`\n✓ Sessions: ${results.sessions.synced}/${sessionsSnapshot.size} synced`);
    if (results.sessions.failed > 0) {
      console.log(`✗ Sessions: ${results.sessions.failed} failed`);
    }
    
    // ==========================================
    // STEP 4: Sync ALL media (after locations and jobs)
    // ==========================================
    console.log('\n[STEP 4/4] SYNCING MEDIA FILES');
    console.log('==========================================');
    const mediaSnapshot = await adminDb.collection('media').get();
    console.log(`Found ${mediaSnapshot.size} media files in Firestore\n`);
    
    if (mediaSnapshot.size === 0) {
      console.log('No media files to sync');
    } else {
      for (const doc of mediaSnapshot.docs) {
        console.log(`\nProcessing media: ${doc.id}`);
        const result = await syncMedia(doc.id);
        
        if (result.success) {
          results.media.synced++;
          console.log(`✓ Successfully synced media ${doc.id}`);
        } else {
          results.media.failed++;
          const errorMsg = `Media ${doc.id}: ${result.error}`;
          results.errors.push(errorMsg);
          console.error(`✗ Failed: ${errorMsg}`);
          if (result.detail) {
            console.error(`  Detail: ${result.detail}`);
          }
          if (result.code) {
            console.error(`  Code: ${result.code}`);
          }
        }
      }
      
      console.log(`\n✓ Media: ${results.media.synced}/${mediaSnapshot.size} synced`);
      if (results.media.failed > 0) {
        console.log(`✗ Media: ${results.media.failed} failed`);
      }
    }
    
    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n========================================');
    console.log('SYNC COMPLETE - SUMMARY');
    console.log('========================================');
    console.log(`Locations: ${results.locations.synced} synced, ${results.locations.failed} failed`);
    console.log(`Jobs: ${results.jobs.synced} synced, ${results.jobs.failed} failed`);
    console.log(`Sessions: ${results.sessions.synced} synced, ${results.sessions.failed} failed`);
    console.log(`Media: ${results.media.synced} synced, ${results.media.failed} failed`);
    
    if (results.errors.length > 0) {
      console.log(`\n⚠ ERRORS (${results.errors.length}):`);
      results.errors.forEach((err, i) => console.error(`  ${i + 1}. ${err}`));
    } else {
      console.log('\n✓ No errors');
    }
    
    console.log('========================================\n');
    
    const message = `Synced ${results.locations.synced} locations, ${results.jobs.synced} jobs, ${results.sessions.synced} sessions, ${results.media.synced} media files`;
    
    return { 
      success: results.errors.length === 0, 
      message,
      counts: {
        locations: results.locations.synced,
        jobs: results.jobs.synced,
        sessions: results.sessions.synced,
        media: results.media.synced,
      },
      errors: results.errors,
      details: results,
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

