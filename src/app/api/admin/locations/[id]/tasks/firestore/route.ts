import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

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
    const tasksSnap = await adminDb
      .collection('tasks')
      .where('locationId', '==', params.id)
      .orderBy('createdAt', 'desc')
      .get();
    
    // Get all task IDs to query media
    const taskIds = tasksSnap.docs.map(doc => doc.id);
    
    // Query media for all tasks in parallel
    const mediaPromises = taskIds.map(async (taskId) => {
      const mediaSnap = await adminDb
        .collection('media')
        .where('locationId', '==', params.id)
        .where('jobId', '==', taskId) // Media uses jobId (which is the task ID in Firestore)
        .get();
      return { taskId, count: mediaSnap.size, media: mediaSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        storageUrl: doc.data().storageUrl,
        mediaType: doc.data().mediaType,
        fileName: doc.data().fileName,
      })) };
    });
    
    const mediaResults = await Promise.all(mediaPromises);
    const mediaMap = new Map(mediaResults.map(r => [r.taskId, r]));
    
    const tasks = tasksSnap.docs.map(doc => {
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
    
    return NextResponse.json({
      success: true,
      tasks
    });
  } catch (error: any) {
    console.error('Failed to get tasks from Firestore:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get tasks' },
      { status: 500 }
    );
  }
}

