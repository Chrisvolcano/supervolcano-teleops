/**
 * LOCATION STRUCTURE API
 * 
 * Returns complete hierarchy: Floor → Room → Target → Action → Tool
 * Uses Firestore (source of truth for admin portal).
 * 
 * Last updated: 2025-11-26
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/locations/[id]/structure
 * Get the complete structure of a location (floors, rooms, targets, actions, tools)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // -----------------------------------------------------------------------
    // 1. AUTHENTICATION
    // -----------------------------------------------------------------------
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);

    const { id: locationId } = params;
    
    console.log('[GET Structure] Fetching structure for location:', locationId);
    
    if (!locationId || locationId === 'undefined' || locationId.includes('undefined')) {
      console.error('[GET Structure] Invalid locationId:', locationId);
      return NextResponse.json(
        { success: false, error: 'Invalid location ID' },
        { status: 400 }
      );
    }
    
    // -----------------------------------------------------------------------
    // 2. FETCH FLOORS
    // -----------------------------------------------------------------------
    console.log('[GET Structure] Fetching floors for location:', locationId);
    const floorsSnapshot = await adminDb
      .collection('floors')
      .where('location_id', '==', locationId)
      .orderBy('floor_number', 'asc')
      .get();
    
    const floors = await Promise.all(
      floorsSnapshot.docs.map(async (floorDoc) => {
        const floorData = floorDoc.data();
        
        // -----------------------------------------------------------------------
        // 3. FETCH ROOMS FOR THIS FLOOR
        // -----------------------------------------------------------------------
        const roomsSnapshot = await adminDb
          .collection('rooms')
          .where('floor_id', '==', floorDoc.id)
          .orderBy('created_at', 'asc')
          .get();
        
        const rooms = await Promise.all(
          roomsSnapshot.docs.map(async (roomDoc) => {
            const roomData = roomDoc.data();
            
            // -----------------------------------------------------------------------
            // 4. FETCH TARGETS FOR THIS ROOM
            // -----------------------------------------------------------------------
            const targetsSnapshot = await adminDb
              .collection('targets')
              .where('room_id', '==', roomDoc.id)
              .orderBy('created_at', 'asc')
              .get();
            
            const targets = await Promise.all(
              targetsSnapshot.docs.map(async (targetDoc) => {
                const targetData = targetDoc.data();
                
                // -----------------------------------------------------------------------
                // 5. FETCH ACTIONS FOR THIS TARGET
                // -----------------------------------------------------------------------
                const actionsSnapshot = await adminDb
                  .collection('actions')
                  .where('target_id', '==', targetDoc.id)
                  .orderBy('created_at', 'asc')
                  .get();
                
                const actions = await Promise.all(
                  actionsSnapshot.docs.map(async (actionDoc) => {
                    const actionData = actionDoc.data();
                    
                    // -----------------------------------------------------------------------
                    // 6. FETCH TOOLS FOR THIS ACTION
                    // -----------------------------------------------------------------------
                    const toolsSnapshot = await adminDb
                      .collection('tools')
                      .where('action_id', '==', actionDoc.id)
                      .orderBy('created_at', 'asc')
                      .get();
                    
                    const tools = toolsSnapshot.docs.map(toolDoc => ({
                      id: toolDoc.id,
                      ...toolDoc.data(),
                    }));
                    
                    return {
                      id: actionDoc.id,
                      ...actionData,
                      tools,
                    };
                  })
                );
                
                return {
                  id: targetDoc.id,
                  ...targetData,
                  actions,
                };
              })
            );
            
            return {
              id: roomDoc.id,
              ...roomData,
              targets,
            };
          })
        );
        
        return {
          id: floorDoc.id,
          ...floorData,
          rooms,
        };
      })
    );
    
    // -----------------------------------------------------------------------
    // 7. CALCULATE STATS
    // -----------------------------------------------------------------------
    const stats = {
      floorCount: floors.length,
      roomCount: floors.reduce((sum: number, f: any) => sum + (f.rooms?.length || 0), 0),
      targetCount: floors.reduce((sum: number, f: any) => 
        sum + (f.rooms?.reduce((s: number, r: any) => s + (r.targets?.length || 0), 0) || 0), 0),
      actionCount: floors.reduce((sum: number, f: any) => 
        sum + (f.rooms?.reduce((s: number, r: any) => 
          s + (r.targets?.reduce((t: number, tgt: any) => t + (tgt.actions?.length || 0), 0) || 0), 0) || 0), 0),
      toolCount: floors.reduce((sum: number, f: any) => 
        sum + (f.rooms?.reduce((s: number, r: any) => 
          s + (r.targets?.reduce((t: number, tgt: any) => 
            t + (tgt.actions?.reduce((a: number, act: any) => a + (act.tools?.length || 0), 0) || 0), 0) || 0), 0) || 0), 0),
    };
    
    console.log('[GET Structure] Final structure stats:', stats);
    
    return NextResponse.json({
      success: true,
      structure: {
        floors,
      },
      stats,
    });
    
  } catch (error: any) {
    console.error('[GET Structure] Error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      locationId: params.id,
    });
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch structure',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
