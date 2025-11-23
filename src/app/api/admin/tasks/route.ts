import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

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
    
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);
    
    const body = await request.json();
    const {
      locationId,
      title,
      description,
      category,
      estimatedDurationMinutes,
      priority
    } = body;
    
    if (!locationId || !title) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: locationId, title' },
        { status: 400 }
      );
    }
    
    // Generate UUID for task ID
    const taskId = crypto.randomUUID();
    
    // Create ONLY in Firestore (source of truth)
    // Tasks are stored in location subcollections
    const locationRef = adminDb.collection('locations').doc(locationId);
    const taskRef = locationRef.collection('tasks').doc(taskId);
    
    await taskRef.set({
      id: taskId,
      locationId,
      title,
      description: description || '',
      category: category || '',
      estimatedDuration: estimatedDurationMinutes || null,
      priority: priority || 'medium',
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    return NextResponse.json({ success: true, id: taskId });
  } catch (error: any) {
    console.error('Failed to create task:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create task' },
      { status: 500 }
    );
  }
}

