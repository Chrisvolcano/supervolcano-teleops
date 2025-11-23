import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function PATCH(
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
    
    // Find task in Firestore to get locationId
    // Tasks are in location subcollections, so we need to search
    const locationsSnap = await adminDb.collection('locations').get();
    let taskRef: FirebaseFirestore.DocumentReference | null = null;
    let locationId: string | null = null;
    
    for (const locDoc of locationsSnap.docs) {
      const taskDoc = await locDoc.ref.collection('tasks').doc(params.id).get();
      if (taskDoc.exists) {
        taskRef = taskDoc.ref;
        locationId = locDoc.id;
        break;
      }
    }
    
    if (!taskRef || !locationId) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Update ONLY in Firestore (source of truth)
    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description || '';
    if (body.category !== undefined) updateData.category = body.category || '';
    if (body.estimatedDurationMinutes !== undefined) updateData.estimatedDuration = body.estimatedDurationMinutes || null;
    if (body.priority !== undefined) updateData.priority = body.priority || null;
    
    await taskRef.update(updateData);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update task:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update task' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    
    // Find task in Firestore to get locationId
    // Tasks are in location subcollections, so we need to search
    const locationsSnap = await adminDb.collection('locations').get();
    let taskRef: FirebaseFirestore.DocumentReference | null = null;
    let locationId: string | null = null;
    
    for (const locDoc of locationsSnap.docs) {
      const taskDoc = await locDoc.ref.collection('tasks').doc(params.id).get();
      if (taskDoc.exists) {
        taskRef = taskDoc.ref;
        locationId = locDoc.id;
        break;
      }
    }
    
    if (!taskRef || !locationId) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Delete ONLY from Firestore (source of truth)
    await taskRef.delete();
    
    // Also delete instructions subcollection if it exists
    const instructionsSnap = await taskRef.collection('instructions').get();
    if (instructionsSnap.docs.length > 0) {
      const batch = adminDb.batch();
      instructionsSnap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete task:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete task' },
      { status: 500 }
    );
  }
}

