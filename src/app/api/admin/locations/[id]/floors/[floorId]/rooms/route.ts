import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

/**
 * ROOMS API ENDPOINT
 * 
 * Handles room creation and listing for location builder.
 * Uses Firestore (source of truth for admin portal).
 * Updated to work with RBAC architecture from PROMPT #11.
 * 
 * Last updated: 2025-01-26
 */

/**
 * GET /api/admin/locations/[id]/floors/[floorId]/rooms
 * Get all rooms for a specific floor
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; floorId: string } }
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

    const { floorId, id: locationId } = params;
    
    console.log('[GET Rooms] Fetching rooms for floor:', floorId, 'location:', locationId);
    
    if (!floorId || floorId === 'undefined' || floorId.includes('undefined')) {
      return NextResponse.json(
        { success: false, error: 'Invalid floor ID' },
        { status: 400 }
      );
    }
    
    // Query Firestore for rooms
    const roomsSnapshot = await adminDb
      .collection('rooms')
      .where('floor_id', '==', floorId)
      .orderBy('created_at', 'asc')
      .get();
    
    const rooms = roomsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    console.log('[GET Rooms] Found rooms:', rooms.length);
    
    return NextResponse.json({
      success: true,
      rooms,
      count: rooms.length,
    });
  } catch (error: any) {
    console.error('[GET Rooms] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch rooms',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/locations/[id]/floors/[floorId]/rooms
 * Create a new room for a floor
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; floorId: string } }
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
    
    // Permission check - use existing requireRole for now (RBAC migration in progress)
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);

    // FIXED: Destructure 'id' and rename to locationId (Next.js uses folder name as param name)
    const { id: locationId, floorId } = params;
    
    // -----------------------------------------------------------------------
    // 2. PARSE REQUEST BODY
    // -----------------------------------------------------------------------
    const body = await request.json();
    const { name, room_type, room_type_id, custom_name } = body;
    
    // Support both room_type (string) and room_type_id (for backward compatibility)
    const finalRoomType = room_type || room_type_id || 'other';
    const finalName = custom_name || name;
    
    if (!finalName || !finalName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Room name is required' },
        { status: 400 }
      );
    }
    
    console.log('[POST Room] Creating room:', { locationId, floorId, name: finalName, room_type: finalRoomType });
    
    // -----------------------------------------------------------------------
    // 3. CHECK FOR DUPLICATE ROOM NAME ON THIS FLOOR
    // -----------------------------------------------------------------------
    const normalizedName = finalName.trim().toLowerCase();
    
    const existingRoomsSnapshot = await adminDb
      .collection('rooms')
      .where('floor_id', '==', floorId)
      .get();
    
    const duplicateRoom = existingRoomsSnapshot.docs.find(doc => {
      const roomData = doc.data();
      const roomName = roomData.custom_name || roomData.name;
      return roomName?.toLowerCase() === normalizedName;
    });
    
    if (duplicateRoom) {
      return NextResponse.json(
        { 
          success: false,
          error: 'A room with this name already exists on this floor',
          hint: 'Room names must be unique within a floor'
        },
        { status: 400 }
      );
    }
    
    // -----------------------------------------------------------------------
    // 4. VERIFY FLOOR EXISTS
    // -----------------------------------------------------------------------
    const floorDoc = await adminDb.collection('floors').doc(floorId).get();
    
    if (!floorDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Floor not found' },
        { status: 404 }
      );
    }
    
    // -----------------------------------------------------------------------
    // 5. CREATE ROOM DOCUMENT IN FIRESTORE
    // -----------------------------------------------------------------------
    const newRoom = {
      name: finalName.trim(),
      custom_name: finalName.trim(), // For backward compatibility
      room_type: finalRoomType.trim().toLowerCase(),
      room_type_id: finalRoomType, // For backward compatibility
      floor_id: floorId,
      location_id: locationId,
      created_by: userId, // FIXED: Use userId from decoded token
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    };
    
    const roomRef = await adminDb.collection('rooms').add(newRoom);
    
    console.log('[POST Room] Created room:', roomRef.id);
    
    // -----------------------------------------------------------------------
    // 6. RETURN SUCCESS WITH CREATED ROOM
    // -----------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      room: {
        id: roomRef.id,
        ...newRoom,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('[POST Room] Error:', error);
    
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
        error: 'Failed to create room',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

