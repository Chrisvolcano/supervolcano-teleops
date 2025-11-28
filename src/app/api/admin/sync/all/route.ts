import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow 60 seconds for sync

export async function POST(request: NextRequest) {
  console.log('═══════════════════════════════════════');
  console.log('🔄 SYNC START - Firestore → SQL');
  console.log('═══════════════════════════════════════');
  
  const results = {
    locations: 0,
    tasks: 0,
    media: 0,
    errors: [] as string[],
  };

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
    
    // Only allow superadmin, admin, and partner_admin
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);
    
    // Test database connection
    console.log('Testing database connection...');
    await sql`SELECT NOW()`;
    console.log('✅ Database connected');

    // Check if tables exist
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('locations', 'jobs', 'media')
    `;
    
    const tables = Array.isArray(tablesResult) 
      ? tablesResult 
      : (tablesResult as any)?.rows || [];
    
    if (tables.length !== 3) {
      const missingTables = ['locations', 'jobs', 'media'].filter(
        (name) => !tables.some((t: any) => t.table_name === name)
      );
      throw new Error(
        `Missing database tables. Please run setup first. Found: ${tables.map((t: any) => t.table_name).join(', ')}`
      );
    }

    // STEP 1: Sync Locations FIRST
    console.log('\n📍 Step 1: Syncing locations...');
    const locationsSnap = await adminDb.collection('locations').get();
    console.log(`Found ${locationsSnap.size} locations in Firestore`);
    
    for (const doc of locationsSnap.docs) {
      const data = doc.data();
      
      try {
        await sql`
          INSERT INTO locations (
            id, name, address, city, state, zip, 
            partner_org_id, created_at, updated_at
          ) VALUES (
            ${doc.id},
            ${data.name || ''},
            ${data.address || ''},
            ${data.city || ''},
            ${data.state || ''},
            ${data.zip || ''},
            ${data.partnerOrgId || data.assignedOrganizationId || 'demo-org'},
            ${data.createdAt?.toDate?.() || new Date()},
            ${data.updatedAt?.toDate?.() || new Date()}
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            address = EXCLUDED.address,
            city = EXCLUDED.city,
            state = EXCLUDED.state,
            zip = EXCLUDED.zip,
            updated_at = EXCLUDED.updated_at
        `;
        results.locations++;
        console.log(`✅ Synced location: ${doc.id}`);
      } catch (error: any) {
        console.error(`❌ Failed to sync location ${doc.id}:`, error.message);
        results.errors.push(`Location ${doc.id}: ${error.message}`);
      }
    }
    console.log(`✅ Synced ${results.locations}/${locationsSnap.size} locations`);

    // STEP 2: Sync Tasks/Jobs AFTER locations
    console.log('\n📋 Step 2: Syncing tasks...');
    const tasksSnap = await adminDb.collection('tasks').get();
    console.log(`Found ${tasksSnap.size} tasks in Firestore`);
    
    for (const doc of tasksSnap.docs) {
      const data = doc.data();
      
      try {
        // Skip if location_id doesn't exist (optional - or set to null)
        const locationId = data.locationId || data.propertyId || null;
        
        await sql`
          INSERT INTO jobs (
            id, title, description, category, priority,
            location_id, location_name, location_address,
            estimated_duration_minutes, status, created_at, updated_at
          ) VALUES (
            ${doc.id},
            ${data.title || ''},
            ${data.description || ''},
            ${data.category || 'general'},
            ${data.priority || 'medium'},
            ${locationId},
            ${data.locationName || ''},
            ${data.locationAddress || ''},
            ${data.estimatedDuration || data.estimatedDurationMinutes || 15},
            ${data.status || 'available'},
            ${data.createdAt?.toDate?.() || new Date()},
            ${data.updatedAt?.toDate?.() || new Date()}
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            priority = EXCLUDED.priority,
            location_id = EXCLUDED.location_id,
            location_name = EXCLUDED.location_name,
            location_address = EXCLUDED.location_address,
            estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at
        `;
        results.tasks++;
        console.log(`✅ Synced task: ${doc.id}`);
      } catch (error: any) {
        console.error(`❌ Failed to sync task ${doc.id}:`, error.message);
        results.errors.push(`Task ${doc.id}: ${error.message}`);
      }
    }
    console.log(`✅ Synced ${results.tasks}/${tasksSnap.size} tasks`);

    // STEP 3: Sync Media LAST
    console.log('\n🎥 Step 3: Syncing media...');
    const mediaSnap = await adminDb.collection('media').get();
    console.log(`Found ${mediaSnap.size} media items in Firestore`);
    
    for (const doc of mediaSnap.docs) {
      const data = doc.data();
      
      try {
        // Validate required fields
        if (!data.storageUrl) {
          console.warn(`Skipping media ${doc.id}: no storage URL`);
          continue;
        }
        
        await sql`
          INSERT INTO media (
            id, job_id, location_id, storage_url, 
            thumbnail_url, file_type, duration_seconds,
            uploaded_at, uploaded_by
          ) VALUES (
            ${doc.id},
            ${data.taskId || data.jobId || null},
            ${data.locationId || null},
            ${data.storageUrl},
            ${data.thumbnailUrl || null},
            ${data.fileType || data.mediaType || 'video/mp4'},
            ${data.durationSeconds || data.duration || null},
            ${data.uploadedAt?.toDate?.() || data.createdAt?.toDate?.() || new Date()},
            ${data.uploadedBy || 'unknown'}
          )
          ON CONFLICT (id) DO UPDATE SET
            job_id = EXCLUDED.job_id,
            storage_url = EXCLUDED.storage_url,
            thumbnail_url = EXCLUDED.thumbnail_url,
            duration_seconds = EXCLUDED.duration_seconds,
            uploaded_at = EXCLUDED.uploaded_at
        `;
        results.media++;
        console.log(`✅ Synced media: ${doc.id}`);
      } catch (error: any) {
        console.error(`❌ Failed to sync media ${doc.id}:`, error.message);
        results.errors.push(`Media ${doc.id}: ${error.message}`);
      }
    }
    console.log(`✅ Synced ${results.media}/${mediaSnap.size} media items`);

    console.log('\n═══════════════════════════════════════');
    console.log('✅ SYNC COMPLETE');
    console.log('═══════════════════════════════════════');
    console.log('Results:', results);

    // Determine overall success
    const hasErrors = results.errors.length > 0;
    const syncedSomething = results.locations > 0 || results.tasks > 0 || results.media > 0;

    return NextResponse.json({
      success: syncedSomething && !hasErrors,
      results: {
        locations: results.locations,
        tasks: results.tasks,
        jobs: results.tasks, // Also include 'jobs' for compatibility
        media: results.media,
        errors: results.errors,
      },
      message: hasErrors 
        ? `Partial sync: ${results.errors.length} errors occurred`
        : `Successfully synced ${results.locations} locations, ${results.tasks} tasks, ${results.media} media`,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('═══════════════════════════════════════');
    console.error('❌ SYNC FAILED');
    console.error('═══════════════════════════════════════');
    console.error('Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        results,
      },
      { status: 500 }
    );
  }
}

