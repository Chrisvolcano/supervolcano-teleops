import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';

export const dynamic = 'force-dynamic';

/**
 * Robot Query API - SQL-backed
 * POST /api/robot/v1/query
 * 
 * Example:
 * {
 *   "locationId": "abc123",
 *   "jobTitle": "clean kitchen",
 *   "actionVerb": "wipe",
 *   "taskType": "action",
 *   "roomLocation": "kitchen",
 *   "keywords": ["counter"],
 *   "humanVerifiedOnly": true
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.ROBOT_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const {
      locationId,
      jobTitle, // Changed from taskTitle - now refers to jobs
      actionVerb,
      taskType, // Changed from momentType
      roomLocation,
      keywords = [],
      tags = [],
      humanVerifiedOnly = false,
      limit = 50
    } = body;
    
    // Build dynamic SQL query
    const conditions = ['1=1']; // Start with always-true condition
    const params: any[] = [];
    let paramIndex = 1;
    
    if (locationId) {
      conditions.push(`t.location_id = $${paramIndex++}`);
      params.push(locationId);
    }
    
    if (jobTitle) {
      conditions.push(`j.title ILIKE $${paramIndex++}`);
      params.push(`%${jobTitle}%`);
    }
    
    if (actionVerb) {
      conditions.push(`t.action_verb = $${paramIndex++}`);
      params.push(actionVerb);
    }
    
    if (taskType) {
      conditions.push(`t.task_type = $${paramIndex++}`);
      params.push(taskType);
    }
    
    if (roomLocation) {
      conditions.push(`t.room_location = $${paramIndex++}`);
      params.push(roomLocation);
    }
    
    if (humanVerifiedOnly) {
      conditions.push(`t.human_verified = TRUE`);
    }
    
    // Keywords search (array overlap)
    if (keywords.length > 0) {
      conditions.push(`t.keywords && $${paramIndex++}`);
      params.push(keywords);
    }
    
    // Tags search
    if (tags.length > 0) {
      conditions.push(`t.tags && $${paramIndex++}`);
      params.push(tags);
    }
    
    params.push(limit);
    
    const query = `
      SELECT 
        t.*,
        l.name as location_name,
        l.address as location_address,
        j.title as job_title,
        j.description as job_description,
        COALESCE(json_agg(
          json_build_object(
            'mediaId', med.id,
            'mediaType', med.media_type,
            'storageUrl', med.storage_url,
            'thumbnailUrl', med.thumbnail_url,
            'durationSeconds', med.duration_seconds,
            'role', tm.media_role,
            'timeOffset', tm.time_offset_seconds
          )
        ) FILTER (WHERE med.id IS NOT NULL), '[]') as media,
        (
          SELECT json_build_object(
            'customInstruction', lp.custom_instruction,
            'overrideData', lp.override_data,
            'createdBy', lp.created_by,
            'updatedAt', lp.updated_at
          )
          FROM location_preferences lp
          WHERE lp.task_id = t.id
          LIMIT 1
        ) as location_preference
      FROM tasks t
      JOIN locations l ON t.location_id = l.id
      JOIN jobs j ON t.job_id = j.id
      LEFT JOIN task_media tm ON t.id = tm.task_id
      LEFT JOIN media med ON tm.media_id = med.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY t.id, l.name, l.address, j.title, j.description
      ORDER BY t.sequence_order ASC
      LIMIT $${paramIndex}
    `;
    
    const result = await sql.query(query, params);
    
    return NextResponse.json({
      query: body,
      results: {
        count: result.rows.length,
        tasks: result.rows.map((row: any) => ({
          id: row.id,
          action: {
            verb: row.action_verb,
            target: row.object_target,
            description: row.description,
          },
          location: {
            id: row.location_id,
            name: row.location_name,
            address: row.location_address,
            room: row.room_location,
          },
          job: {
            id: row.job_id,
            title: row.job_title,
          },
          timing: {
            sequenceOrder: row.sequence_order,
            estimatedDuration: row.estimated_duration_seconds,
          },
          media: row.media,
          preference: row.location_preference && row.location_preference.customInstruction ? {
            customInstruction: row.location_preference.customInstruction,
            updatedBy: row.location_preference.createdBy,
            updatedAt: row.location_preference.updatedAt,
          } : null,
          quality: {
            humanVerified: row.human_verified,
            confidence: row.confidence_score,
            executionCount: row.robot_execution_count,
            successRate: row.robot_success_rate,
          },
          tags: row.tags,
          keywords: row.keywords,
        })),
      },
      metadata: {
        timestamp: new Date().toISOString(),
        apiVersion: 'v1',
      },
    });
    
  } catch (error) {
    console.error('Robot query error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

