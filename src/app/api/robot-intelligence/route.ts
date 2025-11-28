/**
 * ROBOT INTELLIGENCE API
 * OEM partners query robot training data from PostgreSQL
 * Authentication: API Key
 */

import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  let client: Client | null = null;
  
  try {
    // Extract API key from header
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing API key. Include X-API-Key header.' },
        { status: 401 }
      );
    }

    // Connect to PostgreSQL
    client = new Client({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DATABASE,
      port: 5432,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();

    // Verify API key and get organization
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    const keyResult = await client.query(
      `SELECT organization_id, organization_name, is_active, rate_limit_per_hour
       FROM api_keys 
       WHERE key_hash = $1 AND is_active = true`,
      [keyHash]
    );

    if (keyResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or inactive API key' },
        { status: 401 }
      );
    }

    const { organization_id, organization_name } = keyResult.rows[0];

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);
    const offset = parseInt(searchParams.get('offset') || '0');
    const locationId = searchParams.get('locationId');
    const taskId = searchParams.get('taskId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query
    const conditions = ['organization_id = $1'];
    const params: any[] = [organization_id];
    let paramIndex = 2;

    if (locationId) {
      conditions.push(`location_id = $${paramIndex}`);
      params.push(locationId);
      paramIndex++;
    }

    if (taskId) {
      conditions.push(`task_id = $${paramIndex}`);
      params.push(taskId);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex}`);
      params.push(new Date(startDate));
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex}`);
      params.push(new Date(endDate));
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Execute query
    const dataQuery = `
      SELECT 
        firebase_id as id,
        task_id,
        location_id,
        user_id,
        completion_time,
        accuracy,
        errors,
        video_url,
        thumbnail_url,
        annotations,
        file_size,
        duration,
        created_at,
        updated_at
      FROM robot_intelligence
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const result = await client.query(dataQuery, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM robot_intelligence
      WHERE ${whereClause}
    `;

    const countResult = await client.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    // Log API usage
    await client.query(
      `INSERT INTO api_usage (organization_id, endpoint, method, status_code)
       VALUES ($1, $2, $3, $4)`,
      [organization_id, '/api/robot-intelligence', 'GET', 200]
    );

    return NextResponse.json({
      success: true,
      organization: organization_name,
      data: result.rows,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
      filters: {
        locationId,
        taskId,
        startDate,
        endDate,
      },
    });
  } catch (error: any) {
    console.error('[Robot Intelligence API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.end();
    }
  }
}
