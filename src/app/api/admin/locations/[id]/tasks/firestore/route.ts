import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    // Query Firestore - tasks are in root 'tasks' collection with locationId field
    // Try with orderBy first, fall back to without if index missing
    let tasksSnap;
    try {
      tasksSnap = await adminDb
        .collection('tasks')
        .where('locationId', '==', params.id)
        .orderBy('createdAt', 'desc')
        .get();
    } catch (error: any) {
      // If index error, try without orderBy
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.warn('⚠️ Index missing, querying without orderBy...');
        tasksSnap = await adminDb
          .collection('tasks')
          .where('locationId', '==', params.id)
          .get();
        // Sort manually
        const docs = tasksSnap.docs.sort((a, b) => {
          const aTime = a.data().createdAt?.toDate?.()?.getTime() || 0;
          const bTime = b.data().createdAt?.toDate?.()?.getTime() || 0;
          return bTime - aTime; // Descending
        });
        tasksSnap = {
          docs,
          size: docs.length,
        } as any;
      } else {
        throw error;
      }
    }
    
    // Get all task IDs to query media
    const taskIds = tasksSnap.docs.map((doc: QueryDocumentSnapshot) => doc.id);
    
    // Query media for all tasks in parallel
    const mediaPromises = taskIds.map(async (taskId: string) => {
      const mediaSnap = await adminDb
        .collection('media')
        .where('locationId', '==', params.id)
        .where('jobId', '==', taskId) // Media uses jobId (which is the task ID in Firestore)
        .get();
      return { taskId, count: mediaSnap.size, media: mediaSnap.docs.map((doc: QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data(),
        storageUrl: doc.data().storageUrl,
        mediaType: doc.data().mediaType,
        fileName: doc.data().fileName,
      })) };
    });
    
    const mediaResults = await Promise.all(mediaPromises);
    const mediaMap = new Map(mediaResults.map(r => [r.taskId, r]));
    
    const tasks = tasksSnap.docs.map((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      const taskId = doc.id;
      const mediaData = mediaMap.get(taskId) || { count: 0, media: [] };
      
      // Handle Firestore Timestamp conversion
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : 
                       (data.createdAt instanceof Date ? data.createdAt.toISOString() : null);
      const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : 
                       (data.updatedAt instanceof Date ? data.updatedAt.toISOString() : null);
      
      return {
        id: doc.id,
        title: data.title || data.name || 'Unnamed Task',
        description: data.description || '',
        category: data.category || null,
        estimated_duration_minutes: data.estimatedDuration || data.estimated_duration_minutes || null,
        priority: data.priority || 'medium',
        status: data.status || data.state || 'available',
        locationId: data.locationId || params.id,
        createdAt,
        updatedAt,
        media_count: mediaData.count,
        media: mediaData.media, // Include actual media array
        ...data
      };
    });
    
    console.log('✅ GET TASKS FIRESTORE API: Returning', tasks.length, 'tasks');
    
    return NextResponse.json({
      success: true,
      tasks
    });
  } catch (error: any) {
    console.error('❌ GET TASKS FIRESTORE API: Failed:', error);
    console.error('❌ GET TASKS FIRESTORE API: Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get tasks' },
      { status: 500 }
    );
  }
}

