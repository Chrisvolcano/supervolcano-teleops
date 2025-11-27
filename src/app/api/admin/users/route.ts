/**
 * USERS API
 * Fetch users by role for assignment modals
 * Last updated: 2025-11-26
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    // Auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    // Get role filter from query params
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('role');

    // Query users
    let usersQuery = adminDb.collection('users');
    
    if (roleFilter) {
      usersQuery = usersQuery.where('role', '==', roleFilter) as any;
    }

    const usersSnapshot = await usersQuery.get();

    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error: any) {
    console.error('[GET Users] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    );
  }
}

