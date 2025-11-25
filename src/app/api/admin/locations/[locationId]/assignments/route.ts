import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/locations/[locationId]/assignments
 * 
 * Get all cleaners assigned to a location
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { locationId: string } }
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

    const locationId = params.locationId;
    
    const assignmentsResult = await sql`
      SELECT 
        id,
        user_id,
        user_email,
        user_name,
        location_id,
        location_name,
        assigned_by,
        assigned_at,
        is_active
      FROM location_assignments
      WHERE location_id = ${locationId}
        AND is_active = true
      ORDER BY assigned_at DESC
    `;
    
    const assignments = Array.isArray(assignmentsResult)
      ? assignmentsResult
      : (assignmentsResult as any)?.rows || [];
    
    return NextResponse.json({
      success: true,
      assignments,
    });
    
  } catch (error: any) {
    console.error('Failed to get assignments:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/locations/[locationId]/assignments
 * 
 * Assign cleaners to a location
 * Body: { userIds: string[], assignedBy: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { locationId: string } }
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

    const locationId = params.locationId;
    const body = await request.json();
    const { userIds, assignedBy } = body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'userIds array is required' },
        { status: 400 }
      );
    }
    
    // Get location name from Firestore
    const locationDoc = await adminDb.collection('locations').doc(locationId).get();
    const locationData = locationDoc.data();
    const locationName = locationData?.name || '';
    
    // Get user details for each user
    const assignments = [];
    
    for (const userId of userIds) {
      // Get user details from Firebase Auth
      let userEmail = '';
      let userName = '';
      
      try {
        const userRecord = await adminAuth.getUser(userId);
        userEmail = userRecord.email || '';
        userName = userRecord.displayName || userRecord.email || '';
      } catch (err) {
        console.warn(`Could not fetch user details for ${userId}:`, err);
      }
      
      // Upsert assignment (insert or update if exists)
      const result = await sql`
        INSERT INTO location_assignments (
          user_id,
          user_email,
          user_name,
          location_id,
          location_name,
          assigned_by,
          is_active
        ) VALUES (
          ${userId},
          ${userEmail},
          ${userName},
          ${locationId},
          ${locationName},
          ${assignedBy || claims.email || 'admin'},
          true
        )
        ON CONFLICT (user_id, location_id)
        DO UPDATE SET
          is_active = true,
          user_email = EXCLUDED.user_email,
          user_name = EXCLUDED.user_name,
          location_name = EXCLUDED.location_name,
          assigned_by = EXCLUDED.assigned_by,
          assigned_at = NOW(),
          updated_at = NOW()
        RETURNING id
      `;
      
      const assignmentId = Array.isArray(result) 
        ? result[0]?.id 
        : (result as any)?.rows?.[0]?.id;
      
      if (assignmentId) {
        assignments.push({ id: assignmentId });
      }
    }
    
    console.log(`✅ Assigned ${assignments.length} users to location ${locationId}`);
    
    return NextResponse.json({
      success: true,
      message: `Assigned ${assignments.length} users to location`,
      assignments,
    });
    
  } catch (error: any) {
    console.error('Failed to create assignments:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/locations/[locationId]/assignments
 * 
 * Unassign cleaners from a location
 * Body: { userIds: string[] }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { locationId: string } }
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

    const locationId = params.locationId;
    const body = await request.json();
    const { userIds } = body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'userIds array is required' },
        { status: 400 }
      );
    }
    
    // Soft delete by setting is_active = false
    await sql`
      UPDATE location_assignments
      SET is_active = false, updated_at = NOW()
      WHERE location_id = ${locationId}
        AND user_id = ANY(${userIds})
    `;
    
    console.log(`✅ Unassigned ${userIds.length} users from location ${locationId}`);
    
    return NextResponse.json({
      success: true,
      message: `Unassigned ${userIds.length} users from location`,
    });
    
  } catch (error: any) {
    console.error('Failed to delete assignments:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

