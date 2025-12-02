import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';

export const dynamic = 'force-dynamic';

/**
 * Get Media (Videos/Images)
 * GET /api/robot/media
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 1000);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const locationId = searchParams.get('location_id');
    const jobId = searchParams.get('job_id');
    const fileType = searchParams.get('file_type');

    // Build query
    const conditions = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (locationId) {
      conditions.push(`location_id = $${paramIndex++}`);
      params.push(locationId);
    }

    if (jobId) {
      conditions.push(`job_id = $${paramIndex++}`);
      params.push(jobId);
    }

    if (fileType) {
      conditions.push(`file_type = $${paramIndex++}`);
      params.push(fileType);
    }

    params.push(limit);
    params.push(offset);

    const query = `
      SELECT 
        id,
        job_id,
        location_id,
        storage_url,
        thumbnail_url,
        file_type,
        duration_seconds,
        uploaded_at,
        uploaded_by
      FROM media
      WHERE ${conditions.join(' AND ')}
      ORDER BY uploaded_at DESC
      LIMIT $${paramIndex++}
      OFFSET $${paramIndex}
    `;

    const result = await sql.query(query, params);

    // Get total count
    const countResult = await sql.query(
      `SELECT COUNT(*) as total FROM media WHERE ${conditions.join(' AND ')}`,
      params.slice(0, -2)
    );
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    return NextResponse.json({
      success: true,
      media: result.rows.map((row: any) => ({
        id: row.id,
        job_id: row.job_id,
        location_id: row.location_id,
        storage_url: row.storage_url,
        thumbnail_url: row.thumbnail_url,
        file_type: row.file_type,
        duration_seconds: row.duration_seconds,
        uploaded_at: row.uploaded_at ? new Date(row.uploaded_at).toISOString() : null,
        uploaded_by: row.uploaded_by,
      })),
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Robot media API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

