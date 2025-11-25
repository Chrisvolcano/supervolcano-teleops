import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { getUserClaims } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users/[userId]/assigned-locations
 * 
 * Get all locations assigned to a specific user (cleaner)
 * Used by mobile app to filter location list
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Auth check - user can only see their own assignments
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const userId = params.userId;
    
    // Users can only see their own assignments (unless admin)
    if (claims.role !== 'admin' && claims.role !== 'superadmin' && claims.uid !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get all active assignments for this user
    const assignmentsResult = await sql`
      SELECT 
        location_id,
        location_name,
        assigned_at
      FROM location_assignments
      WHERE user_id = ${userId}
        AND is_active = true
      ORDER BY assigned_at DESC
    `;
    
    const assignments = Array.isArray(assignmentsResult)
      ? assignmentsResult
      : (assignmentsResult as any)?.rows || [];
    
    // Extract just the location IDs for easy filtering
    const locationIds = assignments.map((a: any) => a.location_id);
    
    return NextResponse.json({
      success: true,
      locationIds,
      assignments, // Include full details for display
      count: locationIds.length,
    });
    
  } catch (error: any) {
    console.error('Failed to get assigned locations:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

