/**
 * GET /api/admin/videos
 * 
 * List all videos with AI annotations and filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import { sql } from '@/lib/db/postgres';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);
    
    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);

    // Parse query params
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const aiStatus = searchParams.get('aiStatus');
    const roomType = searchParams.get('roomType');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query with parameterized values
    let queryParts = [
      `SELECT 
        m.*,
        l.name as location_name,
        l.address as location_address,
        t.video_url as training_video_url,
        t.room_type,
        t.action_types,
        t.object_labels,
        t.quality_score,
        t.is_featured
      FROM media m
      LEFT JOIN locations l ON m.location_id = l.id
      LEFT JOIN training_videos t ON t.source_media_id = m.id
      WHERE 1=1`
    ];
    
    const params: any[] = [];
    let paramIndex = 1;

    if (locationId) {
      queryParts.push(` AND m.location_id = $${paramIndex++}`);
      params.push(locationId);
    }

    if (aiStatus) {
      queryParts.push(` AND m.ai_status = $${paramIndex++}`);
      params.push(aiStatus);
    }

    if (roomType) {
      queryParts.push(` AND t.room_type = $${paramIndex++}`);
      params.push(roomType);
    }

    queryParts.push(` ORDER BY m.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`);
    params.push(limit, offset);

    const query = queryParts.join(' ');
    const result = await sql.query(query, params);

    const rows = Array.isArray(result) ? result : result.rows;

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*)::int as count FROM media m WHERE 1=1`;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (locationId) {
      countQuery += ` AND m.location_id = $${countParamIndex++}`;
      countParams.push(locationId);
    }
    if (aiStatus) {
      countQuery += ` AND m.ai_status = $${countParamIndex++}`;
      countParams.push(aiStatus);
    }

    const countResult = await sql.query(countQuery, countParams);
    const countRows = Array.isArray(countResult) ? countResult : countResult.rows;
    const total = parseInt(countRows[0]?.count || '0');

    return NextResponse.json({
      videos: rows || [],
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + (rows?.length || 0) < total,
      },
    });
  } catch (error: any) {
    console.error('[API] Videos list error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}

