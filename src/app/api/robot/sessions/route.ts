import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';

export const dynamic = 'force-dynamic';

/**
 * Get Work Sessions
 * GET /api/robot/sessions
 * 
 * Sessions = work instances at a specific location
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
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Build query
    const conditions = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (locationId) {
      conditions.push(`location_id = $${paramIndex++}`);
      params.push(locationId);
    }

    if (startDate) {
      conditions.push(`shift_date >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`shift_date <= $${paramIndex++}`);
      params.push(endDate);
    }

    params.push(limit);
    params.push(offset);

    const query = `
      SELECT 
        id,
        organization_id,
        location_id,
        location_name,
        teleoperator_id as operator_id,
        teleoperator_name as operator_name,
        shift_date as session_date,
        total_tasks,
        total_duration_minutes,
        first_task_started_at as started_at,
        last_task_completed_at as completed_at,
        metadata,
        created_at
      FROM shifts
      WHERE ${conditions.join(' AND ')}
      ORDER BY shift_date DESC, created_at DESC
      LIMIT $${paramIndex++}
      OFFSET $${paramIndex}
    `;

    const result = await sql.query(query, params);

    // Get total count
    const countResult = await sql.query(
      `SELECT COUNT(*) as total FROM shifts WHERE ${conditions.join(' AND ')}`,
      params.slice(0, -2)
    );
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    return NextResponse.json({
      success: true,
      sessions: result.rows.map((row: any) => ({
        id: row.id,
        location_id: row.location_id,
        location_name: row.location_name,
        operator_id: row.operator_id,
        operator_name: row.operator_name,
        session_date: row.session_date,
        total_tasks: row.total_tasks,
        total_duration_minutes: row.total_duration_minutes,
        started_at: row.started_at ? new Date(row.started_at).toISOString() : null,
        completed_at: row.completed_at ? new Date(row.completed_at).toISOString() : null,
        metadata: row.metadata,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
      })),
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Robot sessions API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

