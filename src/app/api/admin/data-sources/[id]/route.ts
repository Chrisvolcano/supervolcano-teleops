import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    requireRole(claims, ['superadmin', 'admin']);

    const { name } = await request.json();
    
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection('dataSources').doc(params.id).update({
      name: name.trim(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] Update data source error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update data source' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    requireRole(claims, ['superadmin', 'admin']);

    const db = getAdminDb();
    await db.collection('dataSources').doc(params.id).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] Delete data source error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete data source' },
      { status: 500 }
    );
  }
}
