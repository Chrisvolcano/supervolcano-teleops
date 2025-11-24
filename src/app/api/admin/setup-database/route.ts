import { NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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
    
    requireRole(claims, ['superadmin', 'admin']);

    console.log('Setting up database tables...');

    // Create locations table (simplified schema matching existing sync)
    await sql`
      CREATE TABLE IF NOT EXISTS locations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(50),
        zip VARCHAR(20),
        partner_org_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create jobs table
    await sql`
      CREATE TABLE IF NOT EXISTS jobs (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        priority VARCHAR(50),
        location_id VARCHAR(255),
        location_name VARCHAR(255),
        location_address TEXT,
        estimated_duration_minutes INTEGER,
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create media table
    await sql`
      CREATE TABLE IF NOT EXISTS media (
        id VARCHAR(255) PRIMARY KEY,
        job_id VARCHAR(255),
        location_id VARCHAR(255),
        storage_url TEXT NOT NULL,
        thumbnail_url TEXT,
        file_type VARCHAR(100),
        duration_seconds INTEGER,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        uploaded_by VARCHAR(255)
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_media_job ON media(job_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_media_location ON media(location_id)`;

    return NextResponse.json({
      success: true,
      message: 'Database tables created successfully',
    });
  } catch (error: any) {
    console.error('Failed to setup database:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

