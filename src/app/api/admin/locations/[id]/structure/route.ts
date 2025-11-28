/**
 * LOCATION STRUCTURE API
 * Fixed version - no orderBy to avoid index issues
 * Last updated: 2025-11-26
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[GET Structure] Starting request');

    // -----------------------------------------------------------------------
    // 1. AUTHENTICATION
    // -----------------------------------------------------------------------
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[GET Structure] No authorization header');
      return NextResponse.json(
        { error: 'Unauthorized', hint: 'No authorization token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
      console.log('[GET Structure] Authenticated user:', decodedToken.uid);
    } catch (error: any) {
      console.error('[GET Structure] Token verification failed:', error.message);
      return NextResponse.json(
        { error: 'Unauthorized', hint: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { id: locationId } = params;
    console.log('[GET Structure] Fetching structure for location:', locationId);

    // -----------------------------------------------------------------------
    // 2. FETCH FLOORS (without orderBy to avoid index issues)
    // -----------------------------------------------------------------------
    let floorsSnapshot;
    try {
      floorsSnapshot = await adminDb
        .collection('floors')
        .where('location_id', '==', locationId)
        .get();
      
      console.log('[GET Structure] Found floors:', floorsSnapshot.docs.length);
    } catch (error: any) {
      console.error('[GET Structure] Error fetching floors:', error);
      throw new Error(`Failed to fetch floors: ${error.message}`);
    }

    // If no floors, return empty structure
    if (floorsSnapshot.empty) {
      console.log('[GET Structure] No floors found, returning empty structure');
      return NextResponse.json({
        success: true,
        structure: { floors: [] },
      });
    }

    // -----------------------------------------------------------------------
    // 3. BUILD HIERARCHY
    // -----------------------------------------------------------------------
    const floors = await Promise.all(
      floorsSnapshot.docs.map(async (floorDoc) => {
        try {
          const floorData = floorDoc.data();

          // Fetch rooms
          const roomsSnapshot = await adminDb
            .collection('rooms')
            .where('floor_id', '==', floorDoc.id)
            .get();

          const rooms = await Promise.all(
            roomsSnapshot.docs.map(async (roomDoc) => {
              const roomData = roomDoc.data();

              // Fetch targets
              const targetsSnapshot = await adminDb
                .collection('targets')
                .where('room_id', '==', roomDoc.id)
                .get();

              const targets = await Promise.all(
                targetsSnapshot.docs.map(async (targetDoc) => {
                  const targetData = targetDoc.data();

                  // Fetch actions
                  const actionsSnapshot = await adminDb
                    .collection('actions')
                    .where('target_id', '==', targetDoc.id)
                    .get();

                  const actions = await Promise.all(
                    actionsSnapshot.docs.map(async (actionDoc) => {
                      const actionData = actionDoc.data();

                      // Fetch tools
                      const toolsSnapshot = await adminDb
                        .collection('tools')
                        .where('action_id', '==', actionDoc.id)
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
        } catch (error: any) {
          console.error('[GET Structure] Error building floor hierarchy:', error);
          throw error;
        }
      })
    );

    // Sort floors by floor_number client-side
    floors.sort((a: any, b: any) => (a.floor_number || 0) - (b.floor_number || 0));

    console.log('[GET Structure] Successfully built structure with', floors.length, 'floors');
    
    return NextResponse.json({
      success: true,
      structure: { floors },
    });

  } catch (error: any) {
    console.error('[GET Structure] Error:', error);
    console.error('[GET Structure] Stack:', error.stack);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch structure',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
