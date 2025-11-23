'use server'

import { sql } from '@/lib/db/postgres';

export interface LocationPreference {
  id?: string;
  locationId: string;
  momentId?: string;
  taskId?: string;
  preferenceType: 'custom_instruction' | 'media_override' | 'sequence_change' | 'complete_override';
  customInstruction?: string;
  overrideData?: any;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Create or update location preference for a task
 */
export async function setLocationPreference(data: {
  locationId: string;
  taskId: string; // Changed from momentId
  customInstruction: string;
  createdBy: string;
}) {
  try {
    // Check if preference already exists
    const existing = await sql`
      SELECT id FROM location_preferences
      WHERE location_id = ${data.locationId}
      AND task_id = ${data.taskId}
    `;
    
    if (existing.rows.length > 0) {
      // Update existing
      await sql`
        UPDATE location_preferences
        SET custom_instruction = ${data.customInstruction},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${existing.rows[0].id}
      `;
      return { success: true, id: existing.rows[0].id, updated: true };
    } else {
      // Create new
      const result = await sql`
        INSERT INTO location_preferences (
          location_id, task_id, preference_type,
          custom_instruction, created_by
        ) VALUES (
          ${data.locationId}, ${data.taskId}, 'custom_instruction',
          ${data.customInstruction}, ${data.createdBy}
        )
        RETURNING id
      `;
      return { success: true, id: result.rows[0].id, updated: false };
    }
  } catch (error: any) {
    console.error('Failed to set preference:', error);
    return { success: false, error: error.message || 'Failed to set preference' };
  }
}

/**
 * Get all preferences for a location
 */
export async function getLocationPreferences(locationId: string) {
  try {
    const result = await sql`
      SELECT 
        lp.*,
        t.title as task_title,
        t.description as task_description,
        j.title as job_title
      FROM location_preferences lp
      LEFT JOIN tasks t ON lp.task_id = t.id
      LEFT JOIN jobs j ON t.job_id = j.id
      WHERE lp.location_id = ${locationId}
      ORDER BY lp.created_at DESC
    `;
    
    return { success: true, preferences: result.rows };
  } catch (error: any) {
    console.error('Failed to get preferences:', error);
    return { success: false, preferences: [] };
  }
}

/**
 * Get preferences for a specific task at a location
 */
export async function getTaskPreference(locationId: string, taskId: string) {
  try {
    const result = await sql`
      SELECT * FROM location_preferences
      WHERE location_id = ${locationId}
      AND task_id = ${taskId}
      LIMIT 1
    `;
    
    if (result.rows.length === 0) {
      return { success: true, preference: null };
    }
    
    return { success: true, preference: result.rows[0] };
  } catch (error: any) {
    console.error('Failed to get preference:', error);
    return { success: false, preference: null };
  }
}

/**
 * Delete location preference
 */
export async function deleteLocationPreference(preferenceId: string) {
  try {
    await sql`
      DELETE FROM location_preferences
      WHERE id = ${preferenceId}
    `;
    
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete preference:', error);
    return { success: false, error: error.message || 'Failed to delete preference' };
  }
}

/**
 * Get tasks for a location with preferences applied
 */
export async function getTasksWithPreferences(locationId: string, jobId?: string) {
  try {
    let queryText = `
      SELECT 
        t.*,
        l.name as location_name,
        j.title as job_title,
        lp.id as preference_id,
        lp.custom_instruction,
        lp.preference_type,
        lp.created_by as preference_created_by,
        lp.updated_at as preference_updated_at
      FROM tasks t
      JOIN locations l ON t.location_id = l.id
      JOIN jobs j ON t.job_id = j.id
      LEFT JOIN location_preferences lp ON (
        lp.location_id = t.location_id 
        AND lp.task_id = t.id
      )
      WHERE t.location_id = $1
    `;
    
    const params: any[] = [locationId];
    
    if (jobId) {
      queryText += ' AND t.job_id = $2';
      params.push(jobId);
    }
    
    queryText += ' ORDER BY t.sequence_order ASC';
    
    const result = await sql.query(queryText, params);
    
    return { success: true, tasks: result.rows };
  } catch (error: any) {
    console.error('Failed to get tasks with preferences:', error);
    return { success: false, tasks: [], error: error.message };
  }
}

