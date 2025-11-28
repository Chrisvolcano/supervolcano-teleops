import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/cleaners
 * 
 * Get all users with location_cleaner role
 * Used to populate assignment modal
 */
export async function GET(request: NextRequest) {
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

    // List all users (pagination may be needed for large datasets)
    const listUsersResult = await adminAuth.listUsers(1000);
    
    const cleaners = [];
    
    for (const userRecord of listUsersResult.users) {
      // Get custom claims
      const customClaims = userRecord.customClaims || {};
      
      // Filter to only location_cleaner (cleaners)
      if (customClaims.role === 'location_cleaner') {
        cleaners.push({
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName || userRecord.email || 'Unknown',
          photoURL: userRecord.photoURL,
          disabled: userRecord.disabled,
          organizationId: customClaims.organizationId || customClaims.partner_org_id,
        });
      }
    }
    
    // Sort by display name
    cleaners.sort((a, b) => 
      (a.displayName || '').localeCompare(b.displayName || '')
    );
    
    return NextResponse.json({
      success: true,
      cleaners,
      count: cleaners.length,
    });
    
  } catch (error: any) {
    console.error('Failed to list cleaners:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}



