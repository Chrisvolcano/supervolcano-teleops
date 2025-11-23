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
 *   "taskTitle": "clean kitchen",
 *   "actionVerb": "wipe",
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
      taskTitle,
      actionVerb,
      momentType,
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
      conditions.push(`m.location_id = $${paramIndex++}`);
      params.push(locationId);
    }
    
    if (taskTitle) {
      conditions.push(`t.title ILIKE $${paramIndex++}`);
      params.push(`%${taskTitle}%`);
    }
    
    if (actionVerb) {
      conditions.push(`m.action_verb = $${paramIndex++}`);
      params.push(actionVerb);
    }
    
    if (momentType) {
      conditions.push(`m.moment_type = $${paramIndex++}`);
      params.push(momentType);
    }
    
    if (roomLocation) {
      conditions.push(`m.room_location = $${paramIndex++}`);
      params.push(roomLocation);
    }
    
    if (humanVerifiedOnly) {
      conditions.push(`m.human_verified = TRUE`);
    }
    
    // Keywords search (array overlap)
    if (keywords.length > 0) {
      conditions.push(`m.keywords && $${paramIndex++}`);
      params.push(keywords);
    }
    
    // Tags search
    if (tags.length > 0) {
      conditions.push(`m.tags && $${paramIndex++}`);
      params.push(tags);
    }
    
    params.push(limit);
    
    const query = `
      SELECT 
        m.*,
        l.name as location_name,
        l.address as location_address,
        t.title as task_title,
        t.description as task_description,
        COALESCE(json_agg(
          json_build_object(
            'mediaId', med.id,
            'mediaType', med.media_type,
            'storageUrl', med.storage_url,
            'thumbnailUrl', med.thumbnail_url,
            'role', mm.media_role,
            'timeOffset', mm.time_offset_seconds
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
          WHERE lp.moment_id = m.id
          LIMIT 1
        ) as location_preference
      FROM moments m
      JOIN locations l ON m.location_id = l.id
      JOIN tasks t ON m.task_id = t.id
      LEFT JOIN moment_media mm ON m.id = mm.moment_id
      LEFT JOIN media med ON mm.media_id = med.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY m.id, l.name, l.address, t.title, t.description
      ORDER BY m.sequence_order ASC
      LIMIT $${paramIndex}
    `;
    
    const result = await sql.query(query, params);
    
    return NextResponse.json({
      query: body,
      results: {
        count: result.rows.length,
        moments: result.rows.map((row: any) => ({
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
          task: {
            id: row.task_id,
            title: row.task_title,
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

