import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

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
    
    // Query Firestore - tasks are in location subcollections
    const tasksSnap = await adminDb
      .collection('locations')
      .doc(params.id)
      .collection('tasks')
      .where('status', '==', 'active')
      .get();
    
    const tasks = tasksSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || data.name || 'Unnamed Task',
        description: data.description || '',
        category: data.category || null,
        estimated_duration_minutes: data.estimatedDuration || data.estimated_duration_minutes || null,
        priority: data.priority || 'medium',
        status: data.status || 'active',
        locationId: params.id,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        ...data
      };
    });
    
    return NextResponse.json({
      success: true,
      tasks
    });
  } catch (error: any) {
    console.error('Failed to get tasks from Firestore:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get tasks' },
      { status: 500 }
    );
  }
}

