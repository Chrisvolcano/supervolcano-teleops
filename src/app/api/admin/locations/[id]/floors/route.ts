import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

/**
 * FLOORS API ENDPOINT
 * 
 * Handles floor creation and listing for location builder.
 * Uses Firestore (source of truth for admin portal).
 * Updated to work with RBAC architecture from PROMPT #11.
 * 
 * Last updated: 2025-01-26
 */

/**
 * GET /api/admin/locations/[id]/floors
 * Get all floors for a location
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
    
    console.log('[GET Floors] Fetching floors for location:', locationId);
    
    if (!locationId || locationId === 'undefined' || locationId.includes('undefined')) {
      console.error('[GET Floors] Invalid locationId:', locationId);
      return NextResponse.json(
        { success: false, error: 'Invalid location ID' },
        { status: 400 }
      );
    }
    
    // Query Firestore for floors from location subcollection (matching structure API)
    const floorsSnapshot = await adminDb
      .collection('locations')
      .doc(locationId)
      .collection('floors')
      .orderBy('sortOrder', 'asc')
      .get();
    
    const floors = floorsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    console.log('[GET Floors] Found floors:', floors.length);
    
    return NextResponse.json({
      success: true,
      floors,
      count: floors.length,
    });
  } catch (error: any) {
    console.error('Failed to fetch floors:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch floors',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/locations/[id]/floors
 * Create a new floor
 */
export async function POST(
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
    
    // Verify token and get user ID
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;
    
    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Permission check - use existing requireRole for now (RBAC migration in progress)
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);

    const locationId = params.id;
    const body = await request.json();
    const { name, sort_order } = body;
    
    console.log('[POST Floor] Creating floor:', { locationId, name, sort_order });
    
    // -----------------------------------------------------------------------
    // 2. VALIDATE INPUT
    // -----------------------------------------------------------------------
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Floor name is required' },
        { status: 400 }
      );
    }
    
    if (!locationId || locationId === 'undefined' || locationId.includes('undefined')) {
      console.error('[POST Floor] Invalid locationId:', locationId);
      return NextResponse.json(
        { success: false, error: 'Invalid location ID' },
        { status: 400 }
      );
    }
    
    const trimmedName = name.trim();
    
    // -----------------------------------------------------------------------
    // 3. CHECK FOR DUPLICATE FLOOR NAME (case-insensitive)
    // Check in the location's floors subcollection (matching structure API)
    // -----------------------------------------------------------------------
    const existingFloorsSnapshot = await adminDb
      .collection('locations')
      .doc(locationId)
      .collection('floors')
      .get();
    
    const normalizedName = trimmedName.toLowerCase();
    const duplicateFloor = existingFloorsSnapshot.docs.find(doc => {
      const floorData = doc.data();
      return floorData.name?.toLowerCase() === normalizedName;
    });
    
    if (duplicateFloor) {
      console.log('[POST Floor] Duplicate found:', duplicateFloor.data());
      return NextResponse.json(
        { 
          success: false,
          error: `A floor named "${duplicateFloor.data().name}" already exists`,
          hint: 'Floor names must be unique within a location'
        },
        { status: 400 }
      );
    }
    
    // -----------------------------------------------------------------------
    // 4. DETERMINE SORT ORDER (auto-increment if not provided)
    // -----------------------------------------------------------------------
    let sortOrder = sort_order;
    
    if (sortOrder === undefined) {
      // Auto-assign next sort order
      const maxSortOrder = existingFloorsSnapshot.docs.reduce((max, doc) => {
        const data = doc.data();
        return Math.max(max, data.sortOrder || 0);
      }, -1);
      sortOrder = maxSortOrder + 1;
    }
    
    // -----------------------------------------------------------------------
    // 5. CREATE FLOOR DOCUMENT IN FIRESTORE (in location subcollection)
    // -----------------------------------------------------------------------
    const newFloor = {
      name: trimmedName,
      sortOrder: sortOrder,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    const floorRef = await adminDb
      .collection('locations')
      .doc(locationId)
      .collection('floors')
      .doc();
    
    await floorRef.set(newFloor);
    
    console.log('[POST Floor] Created floor:', floorRef.id);
    
    // -----------------------------------------------------------------------
    // 6. RETURN SUCCESS WITH CREATED FLOOR
    // -----------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      floor: {
        id: floorRef.id,
        name: trimmedName,
        sortOrder: sortOrder,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('[POST Floor] Error:', error);
    
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
        error: 'Failed to create floor',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

