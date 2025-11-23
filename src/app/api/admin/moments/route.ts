import { NextRequest, NextResponse } from 'next/server';
import { getMoments, createMoment } from '@/lib/repositories/sql/moments';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

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
    
    // Only allow superadmin, admin, and partner_admin
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);
    
    const searchParams = request.nextUrl.searchParams;
    const locationId = searchParams.get('locationId') || undefined;
    const taskId = searchParams.get('taskId') || undefined;
    const momentType = searchParams.get('momentType') || undefined;
    const humanVerified = searchParams.get('humanVerified') === 'true' ? true : 
                         searchParams.get('humanVerified') === 'false' ? false : undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const result = await getMoments({
      locationId,
      taskId,
      momentType,
      humanVerified,
      limit,
      offset
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Get moments error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get moments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    
    // Only allow superadmin, admin, and partner_admin
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);
    
    const body = await request.json();
    const result = await createMoment(body);
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error: any) {
    console.error('Create moment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create moment' },
      { status: 500 }
    );
  }
}

