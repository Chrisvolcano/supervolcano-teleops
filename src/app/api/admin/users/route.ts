/**
 * USERS API
 * Fetch users by role with field normalization
 * Handles both 'displayName' and legacy 'name' fields
 * Last updated: 2025-11-26
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { normalizeUser } from '@/lib/utils/normalizeUser';
import type { UserRole } from '@/types/user.types';

export async function GET(request: NextRequest) {
  try {
    console.log('[GET Users] Request received');

    // ========================================================================
    // 1. AUTHENTICATION
    // ========================================================================
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[GET Users] No authorization header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    console.log('[GET Users] Authenticated:', decodedToken.uid);

    // ========================================================================
    // 2. PARSE QUERY PARAMETERS
    // ========================================================================
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('role') as UserRole | null;

    console.log('[GET Users] Role filter:', roleFilter || 'none');

    // ========================================================================
    // 3. QUERY FIRESTORE
    // ========================================================================
    let usersQuery = adminDb.collection('users');
    
    if (roleFilter) {
      usersQuery = usersQuery.where('role', '==', roleFilter) as any;
    }

    const usersSnapshot = await usersQuery.get();
    console.log('[GET Users] Found users:', usersSnapshot.docs.length);

    // ========================================================================
    // 4. NORMALIZE USER DOCUMENTS
    // ========================================================================
    const users = usersSnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Use normalization utility for consistent output
      return normalizeUser(doc.id, data as any);
    });

    // Filter out users without required organization fields if filtering by field_operator
    const filteredUsers = roleFilter === 'field_operator'
      ? users.filter(user => user.organizationId && user.partnerId)
      : users;

    console.log('[GET Users] Returning users:', filteredUsers.length);

    // ========================================================================
    // 5. RETURN RESPONSE
    // ========================================================================
    return NextResponse.json({
      success: true,
      users: filteredUsers,
      total: filteredUsers.length,
    });

  } catch (error: any) {
    console.error('[GET Users] Error:', error);
    console.error('[GET Users] Stack:', error.stack);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch users', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}

