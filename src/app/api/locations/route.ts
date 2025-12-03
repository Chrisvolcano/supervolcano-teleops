/**
 * LOCATIONS API
 * Create locations for owners
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token to get uid and email
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Allow owners and admins to create locations
    requireRole(claims, ['location_owner', 'admin', 'superadmin']);

    const body = await request.json();
    const { name, address, addressData } = body;

    if (!name || !address) {
      return NextResponse.json({ error: 'Name and address required' }, { status: 400 });
    }

    console.log(`[API] Creating location for user: ${decodedToken.uid}`);

    const locationData = {
      name,
      address,
      addressData: addressData || {},
      assignedOrganizationId: `owner:${decodedToken.uid}`,
      createdBy: decodedToken.email || '',
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

