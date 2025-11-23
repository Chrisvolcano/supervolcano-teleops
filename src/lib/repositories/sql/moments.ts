'use server'

import { sql } from '@/lib/db/postgres';

export interface CreateMomentInput {
  organizationId: string;
  locationId: string;
  taskId: string;
  shiftId?: string;
  
  title: string;
  description: string;
  
  momentType: 'action' | 'observation' | 'decision' | 'navigation' | 'manipulation';
  actionVerb: string;
  objectTarget?: string;
  roomLocation?: string;
  
  sequenceOrder: number;
  estimatedDurationSeconds?: number;
  
  tags: string[];
  keywords: string[];
  
  source: 'manual_entry' | 'task_instruction' | 'video_ai' | 'robot_learning';
  humanVerified: boolean;
  confidenceScore?: number;
  
  createdBy: string;
}

/**
 * Create a new moment
 */
export async function createMoment(data: CreateMomentInput) {
  try {
    // Use sql.query for arrays support
    const queryText = `
      INSERT INTO moments (
        organization_id, location_id, task_id, shift_id,
        title, description,
        moment_type, action_verb, object_target, room_location,
        sequence_order, estimated_duration_seconds,
        tags, keywords,
        source, human_verified, confidence_score,
        created_by
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6,
        $7, $8, $9, $10,
        $11, $12,
        $13, $14,
        $15, $16, $17,
        $18
      )
      RETURNING id
    `;
    
    const params = [
      data.organizationId,
      data.locationId,
      data.taskId,
      data.shiftId || null,
      data.title,
      data.description,
      data.momentType,
      data.actionVerb,
      data.objectTarget || null,
      data.roomLocation || null,
      data.sequenceOrder,
      data.estimatedDurationSeconds || null,
      data.tags || [],
      data.keywords || [],
      data.source,
      data.humanVerified,
      data.confidenceScore || null,
      data.createdBy,
    ];
    
    const result = await sql.query(queryText, params);
    
    return { success: true, id: result.rows[0].id };
  } catch (error: any) {
    console.error('Failed to create moment:', error);
    return { success: false, error: error.message || 'Failed to create moment' };
  }
}

/**
 * Get all moments with filters
 */
export async function getMoments(filters?: {
  locationId?: string;
  taskId?: string;
  momentType?: string;
  humanVerified?: boolean;
  limit?: number;
  offset?: number;
}) {
  try {
    const {
      locationId,
      taskId,
      momentType,
      humanVerified,
      limit = 50,
      offset = 0
    } = filters || {};
    
    let conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (locationId) {
      conditions.push(`m.location_id = $${paramIndex++}`);
      params.push(locationId);
    }
    
    if (taskId) {
      conditions.push(`m.task_id = $${paramIndex++}`);
      params.push(taskId);
    }
    
    if (momentType) {
      conditions.push(`m.moment_type = $${paramIndex++}`);
      params.push(momentType);
    }
    
    if (humanVerified !== undefined) {
      conditions.push(`m.human_verified = $${paramIndex++}`);
      params.push(humanVerified);
    }
    
    params.push(limit, offset);
    
    const queryText = `
      SELECT 
        m.*,
        l.name as location_name,
        l.address as location_address,
        t.title as task_title,
        t.category as task_category
      FROM moments m
      JOIN locations l ON m.location_id = l.id
      JOIN tasks t ON m.task_id = t.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY m.created_at DESC
      LIMIT $${paramIndex++}
      OFFSET $${paramIndex}
    `;
    
    const result = await sql.query(queryText, params);
    
    return { success: true, moments: result.rows };
  } catch (error: any) {
    console.error('Failed to get moments:', error);
    return { success: false, error: error.message || 'Failed to get moments', moments: [] };
  }
}

/**
 * Get moment by ID
 */
export async function getMoment(id: string) {
  try {
    const result = await sql`
      SELECT 
        m.*,
        l.name as location_name,
        l.address as location_address,
        t.title as task_title,
        t.description as task_description
      FROM moments m
      JOIN locations l ON m.location_id = l.id
      JOIN tasks t ON m.task_id = t.id
      WHERE m.id = ${id}
    `;
    
    if (result.rows.length === 0) {
      return { success: false, error: 'Moment not found' };
    }
    
    return { success: true, moment: result.rows[0] };
  } catch (error: any) {
    console.error('Failed to get moment:', error);
    return { success: false, error: error.message || 'Failed to get moment' };
  }
}

/**
 * Update moment
 */
export async function updateMoment(id: string, data: Partial<CreateMomentInput>) {
  try {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (data.title) {
      updates.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    
    if (data.description) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    
    if (data.momentType) {
      updates.push(`moment_type = $${paramIndex++}`);
      values.push(data.momentType);
    }
    
    if (data.actionVerb) {
      updates.push(`action_verb = $${paramIndex++}`);
      values.push(data.actionVerb);
    }
    
    if (data.objectTarget !== undefined) {
      updates.push(`object_target = $${paramIndex++}`);
      values.push(data.objectTarget);
    }
    
    if (data.roomLocation !== undefined) {
      updates.push(`room_location = $${paramIndex++}`);
      values.push(data.roomLocation);
    }
    
    if (data.sequenceOrder !== undefined) {
      updates.push(`sequence_order = $${paramIndex++}`);
      values.push(data.sequenceOrder);
    }
    
    if (data.estimatedDurationSeconds !== undefined) {
      updates.push(`estimated_duration_seconds = $${paramIndex++}`);
      values.push(data.estimatedDurationSeconds);
    }
    
    if (data.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      values.push(data.tags || []);
    }
    
    if (data.keywords !== undefined) {
      updates.push(`keywords = $${paramIndex++}`);
      values.push(data.keywords || []);
    }
    
    if (data.humanVerified !== undefined) {
      updates.push(`human_verified = $${paramIndex++}`);
      values.push(data.humanVerified);
    }
    
    if (updates.length === 0) {
      return { success: false, error: 'No updates provided' };
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    await sql.query(
      `UPDATE moments SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
    
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update moment:', error);
    return { success: false, error: error.message || 'Failed to update moment' };
  }
}

/**
 * Delete moment
 */
export async function deleteMoment(id: string) {
  try {
    await sql`DELETE FROM moments WHERE id = ${id}`;
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete moment:', error);
    return { success: false, error: error.message || 'Failed to delete moment' };
  }
}

/**
 * Get moments count by task
 */
export async function getMomentCountByTask(taskId: string) {
  try {
    const result = await sql`
      SELECT COUNT(*) as count
      FROM moments
      WHERE task_id = ${taskId}
    `;
    
    return { success: true, count: parseInt(result.rows[0].count as string) || 0 };
  } catch (error: any) {
    console.error('Failed to get moment count:', error);
    return { success: false, count: 0 };
  }
}

/**
 * Auto-generate moments from task instructions (helper)
 */
export async function generateMomentsFromInstructions(
  taskId: string,
  locationId: string,
  organizationId: string,
  createdBy: string
) {
  try {
    // Get task with instructions from Firestore
    // Tasks are stored in location subcollections
    const { adminDb } = await import('@/lib/firebaseAdmin');
    
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
    
    // Get instructions from task subcollection
    const instructionsSnap = await adminDb
      .collection('locations')
      .doc(locationId)
      .collection('tasks')
      .doc(taskId)
      .collection('instructions')
      .orderBy('stepNumber', 'asc')
      .get();
    
    const instructions = instructionsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title as string | undefined,
        description: data.description as string | undefined,
        room: data.room as string | undefined,
        stepNumber: data.stepNumber as number | undefined,
      };
    });
    
    if (instructions.length === 0) {
      return { success: false, error: 'No instructions found for this task' };
    }
    
    // Get existing moment count for this task to set sequence order
    const existingCountResult = await getMomentCountByTask(taskId);
    const existingCount = existingCountResult.count || 0;
    
    // Create a moment for each instruction
    const createdMoments = [];
    
    for (let i = 0; i < instructions.length; i++) {
      const instruction = instructions[i];
      
      // Simple keyword extraction (title words)
      const instructionTitle = instruction.title || '';
      const keywords = instructionTitle
        .toLowerCase()
        .split(' ')
        .filter((word: string) => word.length > 3);
      
      // Try to infer action verb (first word usually)
      const titleWords = instructionTitle.toLowerCase().split(' ');
      const actionVerb = titleWords[0] || 'perform';
      
      const taskCategory = (task?.category as string) || undefined;
      
      const momentData: CreateMomentInput = {
        organizationId,
        locationId,
        taskId,
        title: instructionTitle || `Step ${i + 1}`,
        description: instruction.description || instructionTitle || '',
        momentType: 'action', // Default, can be refined
        actionVerb: actionVerb,
        objectTarget: undefined,
        roomLocation: instruction.room || taskCategory || undefined,
        sequenceOrder: existingCount + i + 1,
        estimatedDurationSeconds: 60, // Default 1 minute
        tags: [taskCategory, 'auto-generated'].filter(Boolean) as string[],
        keywords: keywords,
        source: 'task_instruction',
        humanVerified: false,
        confidenceScore: 0.8,
        createdBy,
      };
      
      const result = await createMoment(momentData);
      if (result.success) {
        createdMoments.push(result.id);
      }
    }
    
    return {
      success: true,
      count: createdMoments.length,
      momentIds: createdMoments
    };
  } catch (error: any) {
    console.error('Failed to generate moments:', error);
    return { success: false, error: error.message || 'Failed to generate moments' };
  }
}

