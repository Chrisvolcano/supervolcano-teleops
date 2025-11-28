import { NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Admin auth check
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);

    console.log('📋 Fetching jobs from SQL database...');

    // Fetch jobs with media count
    const jobsResult = await sql`
      SELECT 
        j.id,
        j.title,
        j.description,
        j.category,
        j.priority,
        j.location_id,
        j.location_name,
        j.location_address,
        j.estimated_duration_minutes,
        j.status,
        j.created_at,
        j.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', m.id,
              'storage_url', m.storage_url,
              'thumbnail_url', m.thumbnail_url,
              'file_type', m.file_type,
              'duration_seconds', m.duration_seconds
            )
          ) FILTER (WHERE m.id IS NOT NULL),
          '[]'::json
        ) as media
      FROM jobs j
      LEFT JOIN media m ON m.job_id = j.id
      GROUP BY j.id, j.title, j.description, j.category, j.priority,
               j.location_id, j.location_name, j.location_address,
               j.estimated_duration_minutes, j.status, j.created_at, j.updated_at
      ORDER BY j.created_at DESC
    `;

    // Handle Vercel Postgres result
    const jobs = Array.isArray(jobsResult) ? jobsResult : (jobsResult as any)?.rows || [];

    console.log(`✅ Fetched ${jobs.length} jobs`);

    return NextResponse.json(
      {
        success: true,
        jobs,
        count: jobs.length,
        timestamp: new Date().toISOString(), // Add timestamp for debugging
      },
      {
        // Add cache-busting headers
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );

  } catch (error: any) {
    console.error('❌ Failed to fetch jobs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

