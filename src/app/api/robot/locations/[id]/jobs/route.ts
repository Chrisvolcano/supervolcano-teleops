import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';

export const dynamic = 'force-dynamic';

/**
 * Get Jobs by Location
 * GET /api/robot/locations/{id}/jobs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check
    const apiKey = request.headers.get('X-Robot-API-Key');
    if (!apiKey || apiKey !== process.env.ROBOT_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    const locationId = params.id;

    // Get location info
    const locationResult = await sql.query(
      'SELECT id, name, address, city, state, zip FROM locations WHERE id = $1',
      [locationId]
    );

    if (locationResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      );
    }

    const location = locationResult.rows[0];

    // Get jobs for this location
    const jobsQuery = `
      SELECT 
        j.id,
        j.title,
        j.description,
        j.category,
        j.priority,
        j.estimated_duration_minutes,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT m.id) as video_count,
        j.created_at
      FROM jobs j
      LEFT JOIN tasks t ON j.id = t.job_id
      LEFT JOIN task_media tm ON t.id = tm.task_id
      LEFT JOIN media m ON tm.media_id = m.id AND m.media_type = 'video'
      WHERE j.location_id = $1
      GROUP BY j.id
      ORDER BY j.created_at DESC
    `;

    const jobsResult = await sql.query(jobsQuery, [locationId]);

    return NextResponse.json({
      success: true,
      location_id: location.id,
      location_name: location.name,
      location_address: location.address || null,
      jobs: jobsResult.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description || null,
        category: row.category || null,
        priority: row.priority || 'medium',
        estimated_duration_minutes: row.estimated_duration_minutes || null,
        has_video: parseInt(row.video_count || '0', 10) > 0,
        video_count: parseInt(row.video_count || '0', 10),
        task_count: parseInt(row.task_count || '0', 10),
        created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
      })),
      total: jobsResult.rows.length,
    });
  } catch (error: any) {
    console.error('Robot location jobs API error:', error);
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

