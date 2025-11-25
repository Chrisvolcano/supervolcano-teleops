import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
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

    console.log('🧹 Cleaning up unwanted tasks...');
    
    const tasksToDelete = [
      'Drone reconnaissance sweep',
      'general',
      'Thermal sensor calibration',
    ];
    
    try {
      const tasksRef = adminDb.collection('tasks');
      const snapshot = await tasksRef.get();
      
      let deletedCount = 0;
      const deletedTasks: string[] = [];
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const title = (data.title || '').toLowerCase();
        
        // Check if task matches any of the unwanted tasks
        const shouldDelete = tasksToDelete.some(unwanted => 
          title.includes(unwanted.toLowerCase()) ||
          data.title === unwanted ||
          (data.title === '' && data.category === 'general') ||
          data.title === 'general'
        );
        
        if (shouldDelete) {
          console.log(`Deleting task: ${doc.id} - ${data.title || 'unnamed'}`);
          await doc.ref.delete();
          deletedTasks.push(data.title || doc.id);
          deletedCount++;
        }
      }
      
      console.log(`✅ Deleted ${deletedCount} unwanted tasks`);
      
      return NextResponse.json({
        success: true,
        deletedCount,
        deletedTasks,
        message: `Deleted ${deletedCount} unwanted tasks`,
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

