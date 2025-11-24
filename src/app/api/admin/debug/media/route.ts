import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to inspect media in Firestore vs SQL
 * GET /api/admin/debug/media
 */
export async function GET(request: NextRequest) {
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
    
    console.log('\n========================================');
    console.log('MEDIA DEBUG REPORT');
    console.log('========================================\n');
    
    // Get media from Firestore
    const mediaSnap = await adminDb.collection('media').get();
    console.log(`[FIRESTORE] Found ${mediaSnap.size} media files\n`);
    
    const firestoreMedia = mediaSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        fileName: data.fileName,
        locationId: data.locationId,
        taskId: data.taskId,
        storageUrl: data.storageUrl?.substring(0, 60) + '...',
        uploadedAt: data.uploadedAt?.toDate?.()?.toISOString(),
      };
    });
    
    // Get media from SQL
    const sqlMedia = await sql`SELECT id, location_id, job_id, storage_url FROM media`;
    console.log(`[SQL] Found ${sqlMedia.rows.length} media files\n`);
    
    // Check each Firestore media
    const checks = [];
    
    for (const media of firestoreMedia) {
      console.log(`Checking media: ${media.id} (${media.fileName})`);
      
      const check: any = {
        id: media.id,
        fileName: media.fileName,
        inFirestore: true,
        inSQL: false,
        locationExists: false,
        jobExists: false,
        issues: [],
      };
      
      // Check if in SQL
      const sqlMatch = sqlMedia.rows.find(r => r.id === media.id);
      if (sqlMatch) {
        check.inSQL = true;
        console.log(`  ✓ In SQL`);
      } else {
        console.log(`  ✗ Not in SQL`);
        check.issues.push('Not synced to SQL');
      }
      
      // Check if location exists in SQL
      if (media.locationId) {
        const locCheck = await sql`
          SELECT id, name FROM locations WHERE id = ${media.locationId}
        `;
        if (locCheck.rows.length > 0) {
          check.locationExists = true;
          check.locationName = locCheck.rows[0].name;
          console.log(`  ✓ Location exists: ${locCheck.rows[0].name}`);
        } else {
          console.log(`  ✗ Location ${media.locationId} not in SQL`);
          check.issues.push(`Location ${media.locationId} not in SQL`);
        }
      } else {
        console.log(`  ✗ No locationId`);
        check.issues.push('Missing locationId');
      }
      
      // Check if job exists in SQL
      if (media.taskId) {
        const jobCheck = await sql`
          SELECT id, title FROM jobs WHERE id = ${media.taskId}
        `;
        if (jobCheck.rows.length > 0) {
          check.jobExists = true;
          check.jobTitle = jobCheck.rows[0].title;
          console.log(`  ✓ Job exists: ${jobCheck.rows[0].title}`);
        } else {
          console.log(`  ⚠ Job ${media.taskId} not in SQL (will sync without job reference)`);
          check.issues.push(`Job ${media.taskId} not in SQL (non-blocking)`);
        }
      }
      
      console.log();
      checks.push(check);
    }
    
    // Summary
    const canSync = checks.filter(c => c.locationExists);
    const cannotSync = checks.filter(c => !c.locationExists);
    
    console.log('========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`Total media in Firestore: ${firestoreMedia.length}`);
    console.log(`Total media in SQL: ${sqlMedia.rows.length}`);
    console.log(`Can sync: ${canSync.length}`);
    console.log(`Cannot sync: ${cannotSync.length}`);
    
    if (cannotSync.length > 0) {
      console.log('\nCannot sync (missing location):');
      cannotSync.forEach(c => {
        console.log(`  - ${c.fileName}: ${c.issues.join(', ')}`);
      });
    }
    
    console.log('========================================\n');
    
    return NextResponse.json({
      summary: {
        firestoreCount: firestoreMedia.length,
        sqlCount: sqlMedia.rows.length,
        canSync: canSync.length,
        cannotSync: cannotSync.length,
      },
      checks,
      firestoreMedia,
      sqlMedia: sqlMedia.rows,
    });
  } catch (error: any) {
    console.error('Debug failed:', error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

