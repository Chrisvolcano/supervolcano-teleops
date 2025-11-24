import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * Get all tasks for a specific location from Firestore
 */
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
    
    const locationId = params.id;
    console.log('🔍 GET TASKS API: Loading tasks for location:', locationId);
    
    // Query Firestore - tasks are in root 'tasks' collection with locationId field
    const tasksSnap = await adminDb
      .collection('tasks')
      .where('locationId', '==', locationId)
      .get();
    
    console.log('🔍 GET TASKS API: Found', tasksSnap.size, 'tasks for this location');
    
    const tasks = tasksSnap.docs.map(doc => {
      const data = doc.data();
      
      console.log('🔍 GET TASKS API: Task:', {
        id: doc.id,
        title: data.title,
        locationId: data.locationId,
      });
      
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
        locationId: data.locationId || locationId,
        locationName: data.locationName || '',
        createdAt,
        updatedAt,
        ...data
      };
    });
    
    console.log('✅ GET TASKS API: Returning', tasks.length, 'tasks');
    
    return NextResponse.json({
      success: true,
      tasks,
      count: tasks.length
    });
  } catch (error: any) {
    console.error('❌ GET TASKS API: Failed:', error);
    console.error('❌ GET TASKS API: Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

