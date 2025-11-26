/**
 * LOCATION STRUCTURE API
 * Returns complete hierarchy: Floor → Room → Target → Action → Tool
 * Uses Firebase Auth (no NextAuth)
 * Last updated: 2025-11-26
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // -----------------------------------------------------------------------
    // 1. AUTHENTICATION - Firebase Auth Token
    // -----------------------------------------------------------------------
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[GET Structure] No authorization header found');
      return NextResponse.json(
        { error: 'Unauthorized', hint: 'No authorization token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify Firebase ID token
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
    // 2. FETCH COMPLETE HIERARCHY
    // -----------------------------------------------------------------------
    
    // Fetch floors
    const floorsSnapshot = await adminDb
      .collection('floors')
      .where('location_id', '==', locationId)
      .orderBy('floor_number', 'asc')
      .get();

    console.log('[GET Structure] Found floors:', floorsSnapshot.docs.length);

    const floors = await Promise.all(
      floorsSnapshot.docs.map(async (floorDoc) => {
        const floorData = floorDoc.data();

        // Fetch rooms for this floor
        const roomsSnapshot = await adminDb
          .collection('rooms')
          .where('floor_id', '==', floorDoc.id)
          .get();

        const rooms = await Promise.all(
          roomsSnapshot.docs.map(async (roomDoc) => {
            const roomData = roomDoc.data();

            // Fetch targets for this room
            const targetsSnapshot = await adminDb
              .collection('targets')
              .where('room_id', '==', roomDoc.id)
              .get();

            const targets = await Promise.all(
              targetsSnapshot.docs.map(async (targetDoc) => {
                const targetData = targetDoc.data();

                // Fetch actions for this target
                const actionsSnapshot = await adminDb
                  .collection('actions')
                  .where('target_id', '==', targetDoc.id)
                  .get();

                const actions = await Promise.all(
                  actionsSnapshot.docs.map(async (actionDoc) => {
                    const actionData = actionDoc.data();

                    // Fetch tools for this action
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
      })
    );

    console.log('[GET Structure] Returning structure with', floors.length, 'floors');

    // -----------------------------------------------------------------------
    // 3. RETURN SUCCESS
    // -----------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      structure: { floors },
    });

  } catch (error: any) {
    console.error('[GET Structure] Error:', error);
    console.error('[GET Structure] Error stack:', error.stack);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch structure',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
