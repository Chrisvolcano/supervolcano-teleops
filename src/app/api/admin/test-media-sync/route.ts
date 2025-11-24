import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { syncMedia } from '@/lib/services/sync/firestoreToSql';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * Test endpoint to debug media sync
 * GET /api/admin/test-media-sync
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
    
    console.log('========================================');
    console.log('TESTING MEDIA SYNC');
    console.log('========================================');
    
    // Get all media from Firestore
    const mediaSnap = await adminDb.collection('media').get();
    console.log(`Found ${mediaSnap.size} media files in Firestore`);
    
    const results = {
      total: mediaSnap.size,
      synced: 0,
      failed: 0,
      errors: [] as any[],
      details: [] as any[],
    };
    
    for (const doc of mediaSnap.docs) {
      const data = doc.data();
      const mediaInfo = {
        id: doc.id,
        fileName: data.fileName || 'unnamed',
        locationId: data.locationId || 'missing',
        taskId: data.taskId || 'none',
        mediaType: data.mediaType || 'unknown',
        storageUrl: data.storageUrl ? 'present' : 'missing',
      };
      
      console.log(`\nTesting sync for media ${doc.id}:`);
      console.log(`  - File: ${mediaInfo.fileName}`);
      console.log(`  - Location: ${mediaInfo.locationId}`);
      console.log(`  - Job: ${mediaInfo.taskId}`);
      console.log(`  - Type: ${mediaInfo.mediaType}`);
      console.log(`  - URL: ${mediaInfo.storageUrl}`);
      
      const result = await syncMedia(doc.id);
      
      if (result.success) {
        results.synced++;
        console.log(`  ✓ Success`);
        results.details.push({
          ...mediaInfo,
          status: 'success',
        });
      } else {
        results.failed++;
        console.log(`  ✗ Failed: ${result.error}`);
        results.errors.push({
          ...mediaInfo,
          error: result.error,
        });
        results.details.push({
          ...mediaInfo,
          status: 'failed',
          error: result.error,
        });
      }
    }
    
    console.log('\n========================================');
    console.log('MEDIA SYNC TEST COMPLETE');
    console.log('========================================');
    console.log(`Total: ${results.total}`);
    console.log(`Synced: ${results.synced}`);
    console.log(`Failed: ${results.failed}`);
    
    return NextResponse.json({
      success: true,
      summary: {
        total: results.total,
        synced: results.synced,
        failed: results.failed,
      },
      results: results.details,
      errors: results.errors,
    });
  } catch (error: any) {
    console.error('Test failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        details: error.stack 
      },
      { status: 500 }
    );
  }
}

