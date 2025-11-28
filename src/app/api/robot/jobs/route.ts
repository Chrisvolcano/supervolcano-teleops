import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';

export const dynamic = 'force-dynamic';

/**
 * Get All Jobs
 * GET /api/robot/jobs
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const apiKey = request.headers.get('X-Robot-API-Key');
    if (!apiKey || apiKey !== process.env.ROBOT_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    // Query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');

    // Build query
    const conditions = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      conditions.push(`j.category = $${paramIndex++}`);
      params.push(category);
    }

    if (priority) {
      conditions.push(`j.priority = $${paramIndex++}`);
      params.push(priority);
    }

    params.push(limit);
    params.push(offset);

    const query = `
      SELECT 
        j.id,
        j.title,
        j.description,
        j.category,
        j.priority,
        j.estimated_duration_minutes,
        j.location_id,
        l.name as location_name,
        l.address as location_address,
        l.city,
        l.state,
        l.zip,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT m.id) as video_count,
        j.created_at
      FROM jobs j
      JOIN locations l ON j.location_id = l.id
      LEFT JOIN tasks t ON j.id = t.job_id
      LEFT JOIN task_media tm ON t.id = tm.task_id
      LEFT JOIN media m ON tm.media_id = m.id AND m.media_type = 'video'
      WHERE ${conditions.join(' AND ')}
      GROUP BY j.id, l.name, l.address, l.city, l.state, l.zip
      ORDER BY j.created_at DESC
      LIMIT $${paramIndex++}
      OFFSET $${paramIndex}
    `;

    const result = await sql.query(query, params);
    const totalResult = await sql.query(
      `SELECT COUNT(*) as total FROM jobs j WHERE ${conditions.join(' AND ')}`,
      params.slice(0, -2) // Remove limit and offset
    );
    const total = parseInt(totalResult.rows[0]?.total || '0', 10);

    return NextResponse.json({
      success: true,
      jobs: result.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description || null,
        category: row.category || null,
        priority: row.priority || 'medium',
        estimated_duration_minutes: row.estimated_duration_minutes || null,
        location_id: row.location_id,
        location_name: row.location_name,
        location_address: row.location_address,
        city: row.city || null,
        state: row.state || null,
        zip: row.zip || null,
        has_video: parseInt(row.video_count || '0', 10) > 0,
        video_count: parseInt(row.video_count || '0', 10),
        task_count: parseInt(row.task_count || '0', 10),
        created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
      })),
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Robot jobs API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

