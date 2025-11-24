import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';

export const dynamic = 'force-dynamic';

/**
 * Get All Locations
 * GET /api/robot/locations
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

    const query = `
      SELECT 
        l.id,
        l.name,
        l.address,
        l.city,
        l.state,
        l.zip,
        COUNT(DISTINCT j.id) as job_count
      FROM locations l
      LEFT JOIN jobs j ON l.id = j.location_id
      GROUP BY l.id, l.name, l.address, l.city, l.state, l.zip
      ORDER BY l.name ASC
    `;

    const result = await sql.query(query);

    return NextResponse.json({
      success: true,
      locations: result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        address: row.address || null,
        city: row.city || null,
        state: row.state || null,
        zip: row.zip || null,
        job_count: parseInt(row.job_count || '0', 10),
      })),
      total: result.rows.length,
    });
  } catch (error: any) {
    console.error('Robot locations API error:', error);
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

