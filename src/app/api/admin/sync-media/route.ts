import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { syncMedia } from '@/lib/services/sync/firestoreToSql';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * Force sync media only (for debugging)
 * POST /api/admin/sync-media
 */
export async function POST(request: NextRequest) {
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
    console.log('FORCE MEDIA SYNC');
    console.log('========================================\n');
    
    const mediaSnapshot = await adminDb.collection('media').get();
    console.log(`Found ${mediaSnapshot.size} media files in Firestore\n`);
    
    if (mediaSnapshot.size === 0) {
      return NextResponse.json({
        success: true,
        message: 'No media to sync',
        synced: 0,
        failed: 0,
      });
    }
    
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];
    
    for (const doc of mediaSnapshot.docs) {
      console.log(`\n[${synced + failed + 1}/${mediaSnapshot.size}] Syncing media: ${doc.id}`);
      
      const result = await syncMedia(doc.id);
      
      if (result.success) {
        synced++;
        console.log(`✓ Success`);
      } else {
        failed++;
        const errorMsg = `${doc.id}: ${result.error}`;
        console.error(`✗ Failed: ${errorMsg}`);
        if (result.detail) {
          console.error(`  Detail: ${result.detail}`);
        }
        if (result.code) {
          console.error(`  Code: ${result.code}`);
        }
        errors.push(errorMsg);
      }
    }
    
    console.log('\n========================================');
    console.log('FORCE MEDIA SYNC COMPLETE');
    console.log(`Synced: ${synced}/${mediaSnapshot.size}`);
    console.log(`Failed: ${failed}`);
    if (errors.length > 0) {
      console.log('Errors:');
      errors.forEach(err => console.error(`  - ${err}`));
    }
    console.log('========================================\n');
    
    return NextResponse.json({
      success: failed === 0,
      message: `Synced ${synced}/${mediaSnapshot.size} media files`,
      synced,
      failed,
      errors,
    });
  } catch (error: any) {
    console.error('Force media sync failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message, 
        stack: error.stack 
      },
      { status: 500 }
    );
  }
}

