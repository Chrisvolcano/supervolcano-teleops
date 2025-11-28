/**
 * LOCATION ASSIGNMENTS API
 * Manage cleaner-to-location assignments
 * Endpoints: GET (list), POST (create), DELETE (remove)
 * Last updated: 2025-11-26
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import type { AssignmentRole } from '@/types/assignment.types';

// ============================================================================
// GET - List all assignments for a location
// ============================================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    const { id: locationId } = params;

    // Query assignments for this location
    const assignmentsSnapshot = await adminDb
      .collection('assignments')
      .where('location_id', '==', locationId)
      .where('status', '==', 'active')
      .get();

    // Fetch user details for each assignment
    const assignments = await Promise.all(
      assignmentsSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        // Get user info with normalization
        let userName = 'Unknown User';
        let userEmail = '';
        try {
          const userDoc = await adminDb.collection('users').doc(data.user_id).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            // Use normalized field (prefer displayName, fall back to name)
            userName = userData?.displayName || userData?.name || userName;
            userEmail = userData?.email || '';
          }
        } catch (error) {
          console.error('[GET Assignments] Error fetching user:', error);
        }

        return {
          id: doc.id,
          ...data,
          user_name: userName,
          user_email: userEmail,
          assigned_at: data.assigned_at?.toDate?.()?.toISOString() || null,
          created_at: data.created_at?.toDate?.()?.toISOString() || null,
          updated_at: data.updated_at?.toDate?.()?.toISOString() || null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      assignments,
    });
  } catch (error: any) {
    console.error('[GET Assignments] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments', details: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create new assignment
// ============================================================================
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    const { id: locationId } = params;
    const body = await request.json();
    const { user_id, role } = body;

    // Validation
    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    if (!role || !['oem_teleoperator', 'location_cleaner', 'location_owner', 'partner_manager'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Check if assignment already exists
    const existingAssignment = await adminDb
      .collection('assignments')
      .where('user_id', '==', user_id)
      .where('location_id', '==', locationId)
      .where('status', '==', 'active')
      .get();

    if (!existingAssignment.empty) {
      return NextResponse.json(
        { error: 'User is already assigned to this location' },
        { status: 409 }
      );
    }

    // Create assignment
    const assignmentRef = await adminDb.collection('assignments').add({
      user_id,
      location_id: locationId,
      assigned_by: decodedToken.uid,
      assigned_at: FieldValue.serverTimestamp(),
      status: 'active',
      role: role as AssignmentRole,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    // Fetch created assignment with user details
    const assignmentDoc = await assignmentRef.get();
    const assignmentData = assignmentDoc.data();

    // Get user info with normalization
    let userName = 'Unknown User';
    let userEmail = '';
    try {
      const userDoc = await adminDb.collection('users').doc(user_id).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        // Use normalized field (prefer displayName, fall back to name)
        userName = userData?.displayName || userData?.name || userName;
        userEmail = userData?.email || '';
      }
    } catch (error) {
      console.error('[POST Assignment] Error fetching user:', error);
    }

    return NextResponse.json({
      success: true,
      assignment: {
        id: assignmentRef.id,
        ...assignmentData,
        user_name: userName,
        user_email: userEmail,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('[POST Assignment] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create assignment', details: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Remove assignment (soft delete by setting status to inactive)
// ============================================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'assignmentId query parameter is required' },
        { status: 400 }
      );
    }

    // Update assignment status to inactive (soft delete)
    await adminDb.collection('assignments').doc(assignmentId).update({
      status: 'inactive',
      updated_at: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'Assignment removed successfully',
    });
  } catch (error: any) {
    console.error('[DELETE Assignment] Error:', error);
    return NextResponse.json(
      { error: 'Failed to remove assignment', details: error.message },
      { status: 500 }
    );
  }
}
