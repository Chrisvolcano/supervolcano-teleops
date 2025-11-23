import { NextRequest, NextResponse } from 'next/server';
import { linkMediaToTask, getTaskMedia } from '@/lib/repositories/sql/tasks';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

/**
 * GET - Get all media linked to a task
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
    
    const result = await getTaskMedia(params.id);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Get task media error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get media' },
      { status: 500 }
    );
  }
}

/**
 * POST - Link media to a task
 */
export async function POST(
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
    
    const body = await request.json();
    const { mediaId, role } = body;
    
    if (!mediaId) {
      return NextResponse.json(
        { error: 'Missing mediaId' },
        { status: 400 }
      );
    }
    
    const result = await linkMediaToTask(params.id, mediaId, role);
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error: any) {
    console.error('Link media error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to link media' },
      { status: 500 }
    );
  }
}

