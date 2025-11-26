import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import { sql } from '@/lib/db/postgres';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

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
    
    // First, try to get ALL tasks to see what we have (for debugging)
    const allTasksSnap = await adminDb.collection('tasks').limit(10).get();
    console.log('🔍 GET TASKS API: Sample of all tasks in database:', allTasksSnap.size);
    allTasksSnap.docs.forEach((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      console.log('   - Task:', {
        id: doc.id,
        title: data.title,
        locationId: data.locationId,
        propertyId: data.propertyId,
        hasLocationId: !!data.locationId,
        hasPropertyId: !!data.propertyId,
      });
    });
    
    // Query Firestore - tasks are in root 'tasks' collection with locationId field
    // Also check propertyId for backward compatibility during migration
    let tasksSnap;
    try {
      tasksSnap = await adminDb
        .collection('tasks')
        .where('locationId', '==', locationId)
        .get();
      console.log('🔍 GET TASKS API: Found', tasksSnap.size, 'tasks with locationId match');
    } catch (error: any) {
      console.error('❌ GET TASKS API: Query with locationId failed:', error);
      // Fallback: try propertyId
      console.log('🔍 GET TASKS API: Trying propertyId query...');
      tasksSnap = await adminDb
        .collection('tasks')
        .where('propertyId', '==', locationId)
        .get();
      console.log('🔍 GET TASKS API: Found', tasksSnap.size, 'tasks with propertyId match');
    }
    
    // If still 0, try getting all tasks and filtering manually
    if (tasksSnap.size === 0) {
      console.log('🔍 GET TASKS API: No tasks found with query, trying manual filter...');
      const allTasks = await adminDb.collection('tasks').get();
      const matchingTasks = allTasks.docs.filter((doc: QueryDocumentSnapshot) => {
        const data = doc.data();
        return data.locationId === locationId || data.propertyId === locationId;
      });
      console.log('🔍 GET TASKS API: Found', matchingTasks.length, 'tasks via manual filter');
      tasksSnap = {
        docs: matchingTasks,
        size: matchingTasks.length,
      } as any;
    }
    
    console.log('🔍 GET TASKS API: Total tasks found:', tasksSnap.size);
    
    // Fetch floor information for tasks that have floor_id
    const floorIds = new Set<string>();
    tasksSnap.docs.forEach((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      if (data.floor_id) {
        floorIds.add(data.floor_id);
      }
    });

    // Fetch floor names from PostgreSQL
    const floorMap = new Map<string, string>();
    if (floorIds.size > 0) {
      try {
        const floorIdsArray = Array.from(floorIds);
        const floorsResult = await sql`
          SELECT id, name FROM location_floors
          WHERE id = ANY(${floorIdsArray}::uuid[])
        `;
        const floors = Array.isArray(floorsResult) ? floorsResult : (floorsResult as any)?.rows || [];
        floors.forEach((floor: any) => {
          floorMap.set(floor.id, floor.name);
        });
        console.log('[GET Tasks] Fetched floor names:', floorMap);
      } catch (error) {
        console.error('[GET Tasks] Error fetching floor names:', error);
      }
    }

    const tasks = tasksSnap.docs.map((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      
      // Use locationId or propertyId (for backward compatibility)
      const taskLocationId = data.locationId || data.propertyId || locationId;
      
      // Get floor name if floor_id exists
      const floorId = data.floor_id;
      const floorName = floorId ? floorMap.get(floorId) || 'Unknown Floor' : null;
      
      console.log('🔍 GET TASKS API: Processing task:', {
        id: doc.id,
        title: data.title,
        locationId: data.locationId,
        propertyId: data.propertyId,
        floorId: floorId,
        floorName: floorName,
        finalLocationId: taskLocationId,
        matches: taskLocationId === locationId,
      });
      
      // Handle Firestore Timestamp conversion
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : 
                       (data.createdAt instanceof Date ? data.createdAt.toISOString() : 
                       (data.createdAt ? new Date(data.createdAt).toISOString() : null));
      const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : 
                       (data.updatedAt instanceof Date ? data.updatedAt.toISOString() : 
                       (data.updatedAt ? new Date(data.updatedAt).toISOString() : null));
      
      return {
        id: doc.id,
        title: data.title || data.name || 'Unnamed Task',
        description: data.description || '',
        category: data.category || null,
        estimated_duration_minutes: data.estimatedDuration || data.estimated_duration_minutes || null,
        priority: data.priority || 'medium',
        status: data.status || data.state || 'available',
        locationId: taskLocationId,
        locationName: data.locationName || '',
        floor_id: floorId || null,
        floor_name: floorName || null,
        room: data.room || data.room_name || null,
        target: data.target || data.target_name || null,
        action: data.action || data.action_name || null,
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

