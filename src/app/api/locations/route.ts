/**
 * LOCATIONS API
 * Create locations for owners
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (err) {
      console.error('[API] Token verification failed:', err);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const uid = decodedToken.uid;
    const email = decodedToken.email;
    
    // Fetch user profile from Firestore to get role
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userData = userDoc.data();
    const role = userData?.role;
    
    console.log(`[API] User ${email} has role: ${role}`);
    
    // Allow owners and admins
    const allowedRoles = ['location_owner', 'admin', 'superadmin'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, address, addressData } = body;

    if (!name || !address) {
      return NextResponse.json({ error: 'Name and address required' }, { status: 400 });
    }

    console.log(`[API] Creating location for user: ${uid}`);

    const locationData = {
      name,
      address,
      addressData: addressData || {},
      assignedOrganizationId: `owner:${uid}`,
      createdBy: email,
      status: 'active',
      hasStructure: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('locations').add(locationData);

    console.log(`[API] Created location: ${docRef.id}`);

    return NextResponse.json({
      success: true,
      locationId: docRef.id,
      message: 'Location created',
    });
  } catch (error: any) {
    console.error('[API] Create location error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create location' },
      { status: 500 }
    );
  }
}

