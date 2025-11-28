import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { adminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/locations/[id]/generate-tasks
 * Auto-generate tasks from the location structure
 */
export async function POST(
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
    
    requireRole(claims, ['superadmin', 'admin']);

    const locationId = params.id;
    
    // Get complete structure
    const roomsResult = await sql`
      SELECT 
        lr.id as room_id,
        lr.custom_name,
        rt.name as room_type_name,
        lf.name as floor_name
      FROM location_rooms lr
      LEFT JOIN room_types rt ON lr.room_type_id = rt.id
      LEFT JOIN location_floors lf ON lr.floor_id = lf.id
      WHERE lr.location_id = ${locationId}
    `;
    
    const rooms = Array.isArray(roomsResult) ? roomsResult : (roomsResult as any)?.rows || [];
    
    if (rooms.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No rooms found in location structure' },
        { status: 400 }
      );
    }
    
    const targetsResult = await sql`
      SELECT 
        lt.id as target_id,
        lt.room_id,
        lt.custom_name,
        lt.notes,
        tt.name as target_type_name
      FROM location_targets lt
      LEFT JOIN target_types tt ON lt.target_type_id = tt.id
      WHERE lt.room_id = ANY(${rooms.map((r: any) => r.room_id)}::uuid[])
    `;
    
    const targets = Array.isArray(targetsResult) ? targetsResult : (targetsResult as any)?.rows || [];
    
    if (targets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No targets found in location structure' },
        { status: 400 }
      );
    }
    
    const actionsResult = await sql`
      SELECT 
        ta.target_id,
        ta.custom_instructions,
        ta.custom_duration_minutes,
        at.name as action_type_name,
        at.estimated_duration_minutes as default_duration,
        at.instructions as default_instructions
      FROM target_actions ta
      LEFT JOIN action_types at ON ta.action_type_id = at.id
      WHERE ta.target_id = ANY(${targets.map((t: any) => t.target_id)}::uuid[])
    `;
    
    const actions = Array.isArray(actionsResult) ? actionsResult : (actionsResult as any)?.rows || [];
    
    if (actions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No actions found in location structure' },
        { status: 400 }
      );
    }
    
    // Get location name
    const locationDoc = await adminDb.collection('locations').doc(locationId).get();
    const locationData = locationDoc.data();
    const locationName = locationData?.name || '';
    
    const tasksCreated = [];
    
    // Generate tasks from structure
    for (const action of actions) {
      const target = targets.find((t: any) => t.target_id === action.target_id);
      if (!target) continue;
      
      const room = rooms.find((r: any) => r.room_id === target.room_id);
      if (!room) continue;
      
      // Build task title: "{action} {room} {target}"
      // Example: "Wipe Kitchen Counter"
      const roomName = room.custom_name || room.room_type_name;
      const targetName = target.custom_name || target.target_type_name;
      const actionName = action.action_type_name;
      
      const title = `${actionName} ${roomName} ${targetName}`;
      const description = action.custom_instructions || action.default_instructions || '';
      const duration = action.custom_duration_minutes || action.default_duration || 5;
      
      // Create task ID
      const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Insert into SQL
      await sql`
        INSERT INTO jobs (
          id,
          title,
          description,
          category,
          priority,
          location_id,
          location_name,
          estimated_duration_minutes,
          status
        ) VALUES (
          ${taskId},
          ${title},
          ${description},
          'general',
          'medium',
          ${locationId},
          ${locationName},
          ${duration},
          'available'
        )
      `;
      
      // Insert into Firestore (for backwards compatibility)
      await adminDb.collection('tasks').doc(taskId).set({
        title,
        description,
        category: 'general',
        priority: 'medium',
        locationId,
        locationName,
        estimatedDuration: duration,
        status: 'available',
        roomId: room.room_id,
        targetId: target.target_id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      tasksCreated.push({
        id: taskId,
        title,
        room: roomName,
        target: targetName,
        action: actionName,
      });
    }
    
    console.log(`✅ Generated ${tasksCreated.length} tasks for location ${locationId}`);
    
    return NextResponse.json({
      success: true,
      tasksCreated: tasksCreated.length,
      tasks: tasksCreated,
    });
  } catch (error: any) {
    console.error('Failed to generate tasks:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

