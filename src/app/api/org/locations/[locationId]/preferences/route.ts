import { NextRequest, NextResponse } from 'next/server';
import { getLocationPreferences } from '@/lib/repositories/sql/locationPreferences';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { locationId: string } }
) {
  try {
    // Auth check
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Allow org_manager, admin, and superadmin
    requireRole(claims, ['org_manager', 'admin', 'superadmin', 'partner_admin']);
    
    // TODO: Verify user has access to this specific location
    
    const result = await getLocationPreferences(params.locationId);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Get preferences error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get preferences' },
      { status: 500 }
    );
  }
}

