import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';

export const dynamic = 'force-dynamic';

/**
 * Get Videos for a Job
 * GET /api/robot/jobs/{id}/videos
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

    const jobId = params.id;

    // Verify job exists
    const jobResult = await sql.query(
      'SELECT id, title FROM jobs WHERE id = $1',
      [jobId]
    );

    if (jobResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    // Get all videos for tasks in this job
    const videosQuery = `
      SELECT 
        m.id,
        m.storage_url,
        m.thumbnail_url,
        m.duration_seconds,
        m.file_size_bytes,
        m.media_type,
        m.uploaded_at,
        m.uploaded_by,
        t.id as task_id,
        t.title as task_title,
        tm.media_role,
        tm.time_offset_seconds
      FROM jobs j
      JOIN tasks t ON j.id = t.job_id
      JOIN task_media tm ON t.id = tm.task_id
      JOIN media m ON tm.media_id = m.id
      WHERE j.id = $1
        AND m.media_type = 'video'
      ORDER BY t.sequence_order ASC, tm.time_offset_seconds ASC
    `;

    const videosResult = await sql.query(videosQuery, [jobId]);

    return NextResponse.json({
      success: true,
      job_id: jobId,
      job_title: jobResult.rows[0].title,
      videos: videosResult.rows.map((row: any) => ({
        id: row.id,
        storage_url: row.storage_url,
        thumbnail_url: row.thumbnail_url || null,
        duration_seconds: row.duration_seconds || null,
        file_size_bytes: row.file_size_bytes || null,
        uploaded_at: row.uploaded_at ? new Date(row.uploaded_at).toISOString() : null,
        uploaded_by: row.uploaded_by || null,
        task_id: row.task_id,
        task_title: row.task_title || null,
        media_role: row.media_role || 'instruction',
        time_offset_seconds: row.time_offset_seconds || null,
      })),
      total: videosResult.rows.length,
    });
  } catch (error: any) {
    console.error('Robot job videos API error:', error);
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

