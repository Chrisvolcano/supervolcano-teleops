import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
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

    console.log('🧹 Cleaning up unwanted tasks from Firestore and SQL...');
    
    const tasksToDelete = [
      'Drone reconnaissance sweep',
      'general',
      'Thermal sensor calibration',
    ];
    
    try {
      // Step 1: Delete from Firestore
      const tasksRef = adminDb.collection('tasks');
      const snapshot = await tasksRef.get();
      
      console.log(`📋 Found ${snapshot.docs.length} tasks in Firestore`);
      
      let deletedFromFirestore = 0;
      const deletedTasks: string[] = [];
      const deletedTaskIds: string[] = [];
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const title = (data.title || '').toLowerCase();
        const actualTitle = data.title || '';
        
        console.log(`Checking task: ${doc.id} - "${actualTitle}" (category: ${data.category})`);
        
        // Check if task matches any of the unwanted tasks
        const shouldDelete = tasksToDelete.some(unwanted => {
          const unwantedLower = unwanted.toLowerCase();
          return (
            title.includes(unwantedLower) ||
            actualTitle === unwanted ||
            (actualTitle === '' && data.category === 'general') ||
            actualTitle === 'general' ||
            (unwanted === 'general' && data.category === 'general' && !actualTitle)
          );
        });
        
        if (shouldDelete) {
          console.log(`✓ Deleting from Firestore: ${doc.id} - "${actualTitle || 'unnamed'}"`);
          await doc.ref.delete();
          deletedTasks.push(actualTitle || doc.id);
          deletedTaskIds.push(doc.id);
          deletedFromFirestore++;
        }
      }
      
      console.log(`✅ Deleted ${deletedFromFirestore} tasks from Firestore`);
      
      // Step 2: Delete from SQL (jobs table) using task IDs
      let deletedFromSQL = 0;
      if (deletedTaskIds.length > 0) {
        console.log(`🗄️ Deleting ${deletedTaskIds.length} tasks from SQL...`);
        for (const taskId of deletedTaskIds) {
          try {
            // Try to delete by Firestore ID (stored in jobs.firestore_id or jobs.id)
            const result = await sql`
              DELETE FROM jobs 
              WHERE id = ${taskId} OR firestore_id = ${taskId}
            `;
            deletedFromSQL++;
            console.log(`✓ Deleted from SQL: ${taskId}`);
          } catch (sqlError: any) {
            console.warn(`⚠️ Could not delete ${taskId} from SQL:`, sqlError.message);
          }
        }
      }
      
      console.log(`✅ Cleanup complete: ${deletedFromFirestore} from Firestore, ${deletedFromSQL} from SQL`);
      
      return NextResponse.json({
        success: true,
        deletedCount: deletedFromFirestore,
        deletedFromSQL,
        deletedTasks,
        message: `Deleted ${deletedFromFirestore} tasks from Firestore and ${deletedFromSQL} from SQL`,
      });
      
    } catch (error: any) {
      console.error('❌ Failed to cleanup tasks:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Cleanup failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

