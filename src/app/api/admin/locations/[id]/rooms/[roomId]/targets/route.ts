/**
 * TARGETS API ENDPOINT
 * 
 * Handles target creation for location builder.
 * Uses Firestore (source of truth for admin portal).
 * 
 * Last updated: 2025-11-26
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/locations/[id]/rooms/[roomId]/targets
 * Create a new target in a room
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; roomId: string } }
) {
  try {
    // -----------------------------------------------------------------------
    // 1. AUTHENTICATION
    // -----------------------------------------------------------------------
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify token and get user ID
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;
    
    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Permission check
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);

    const { id: locationId, roomId } = params;
    const body = await request.json();
    const { name, target_type } = body;
    
    console.log('[POST Target] Creating target:', { name, target_type, roomId, locationId });
    
    // -----------------------------------------------------------------------
    // 2. VALIDATE INPUT
    // -----------------------------------------------------------------------
    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Target name is required' },
        { status: 400 }
      );
    }
    
    if (!roomId || roomId === 'undefined' || roomId.includes('undefined')) {
      return NextResponse.json(
        { success: false, error: 'Invalid room ID' },
        { status: 400 }
      );
    }
    
    // -----------------------------------------------------------------------
    // 3. VERIFY ROOM EXISTS AND GET FLOOR_ID
    // -----------------------------------------------------------------------
    const roomDoc = await adminDb.collection('rooms').doc(roomId).get();
    
    if (!roomDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }
    
    const roomData = roomDoc.data();
    const floorId = roomData?.floor_id;
    
    if (!floorId) {
      return NextResponse.json(
        { success: false, error: 'Room must be assigned to a floor' },
        { status: 400 }
      );
    }
    
    // -----------------------------------------------------------------------
    // 4. CHECK FOR DUPLICATE TARGET NAME IN ROOM
    // -----------------------------------------------------------------------
    const normalizedName = name.trim().toLowerCase();
    
    const existingTargetsSnapshot = await adminDb
      .collection('targets')
      .where('room_id', '==', roomId)
      .get();
    
    const duplicateTarget = existingTargetsSnapshot.docs.find(doc => {
      const targetData = doc.data();
      const targetName = targetData.name || targetData.custom_name;
      return targetName?.toLowerCase() === normalizedName;
    });
    
    if (duplicateTarget) {
      return NextResponse.json(
        { 
          success: false,
          error: 'A target with this name already exists in this room',
          hint: 'Target names must be unique within a room'
        },
        { status: 400 }
      );
    }
    
    // -----------------------------------------------------------------------
    // 5. CREATE TARGET DOCUMENT IN FIRESTORE
    // -----------------------------------------------------------------------
    const newTarget = {
      name: name.trim(),
      target_type: target_type?.trim() || 'general',
      room_id: roomId,
      floor_id: floorId,
      location_id: locationId,
      created_by: userId, // FIXED: Use userId from decoded token
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    };
    
    const targetRef = await adminDb.collection('targets').add(newTarget);
    
    console.log('[POST Target] Created target:', targetRef.id);
    
    // -----------------------------------------------------------------------
    // 6. RETURN SUCCESS WITH CREATED TARGET
    // -----------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      target: {
        id: targetRef.id,
        ...newTarget,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('[POST Target] Error:', error);
    
    // Handle permission errors
    if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create target',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

