/**
 * ACTIONS API ENDPOINT
 * 
 * Handles action creation for location builder.
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
 * POST /api/admin/locations/[id]/targets/[targetId]/actions
 * Create a new action for a target
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; targetId: string } }
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

    const { id: locationId, targetId } = params;
    const body = await request.json();
    const { name, description } = body;
    
    console.log('[POST Action] Creating action:', { name, description, targetId, locationId });
    
    // -----------------------------------------------------------------------
    // 2. VALIDATE INPUT
    // -----------------------------------------------------------------------
    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Action name is required' },
        { status: 400 }
      );
    }
    
    if (!targetId || targetId === 'undefined' || targetId.includes('undefined')) {
      return NextResponse.json(
        { success: false, error: 'Invalid target ID' },
        { status: 400 }
      );
    }
    
    // -----------------------------------------------------------------------
    // 3. VERIFY TARGET EXISTS AND GET ROOM_ID AND FLOOR_ID
    // -----------------------------------------------------------------------
    const targetDoc = await adminDb.collection('targets').doc(targetId).get();
    
    if (!targetDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Target not found' },
        { status: 404 }
      );
    }
    
    const targetData = targetDoc.data();
    const roomId = targetData?.room_id;
    const floorId = targetData?.floor_id;
    
    if (!roomId) {
      return NextResponse.json(
        { success: false, error: 'Target must be assigned to a room' },
        { status: 400 }
      );
    }
    
    // -----------------------------------------------------------------------
    // 4. CHECK FOR DUPLICATE ACTION NAME IN TARGET
    // -----------------------------------------------------------------------
    const normalizedName = name.trim().toLowerCase();
    
    const existingActionsSnapshot = await adminDb
      .collection('actions')
      .where('target_id', '==', targetId)
      .get();
    
    const duplicateAction = existingActionsSnapshot.docs.find(doc => {
      const actionData = doc.data();
      return actionData.name?.toLowerCase() === normalizedName;
    });
    
    if (duplicateAction) {
      return NextResponse.json(
        { 
          success: false,
          error: 'An action with this name already exists for this target',
          hint: 'Action names must be unique within a target'
        },
        { status: 400 }
      );
    }
    
    // -----------------------------------------------------------------------
    // 5. CREATE ACTION DOCUMENT IN FIRESTORE
    // -----------------------------------------------------------------------
    const newAction = {
      name: name.trim(),
      description: description?.trim() || '',
      target_id: targetId,
      room_id: roomId,
      floor_id: floorId,
      location_id: locationId,
      status: 'pending',
      created_by: userId, // FIXED: Use userId from decoded token
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    };
    
    const actionRef = await adminDb.collection('actions').add(newAction);
    
    console.log('[POST Action] Created action:', actionRef.id);
    
    // -----------------------------------------------------------------------
    // 6. RETURN SUCCESS WITH CREATED ACTION
    // -----------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      action: {
        id: actionRef.id,
        ...newAction,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('[POST Action] Error:', error);
    
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
        error: 'Failed to create action',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

