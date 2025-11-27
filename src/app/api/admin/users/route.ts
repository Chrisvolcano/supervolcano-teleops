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
    console.log('[GET Users] ============ REQUEST START ============');
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
      console.log('[GET Users] Applying role filter:', roleFilter);
      usersQuery = usersQuery.where('role', '==', roleFilter) as any;
    }

    const usersSnapshot = await usersQuery.get();
    console.log('[GET Users] Raw documents found:', usersSnapshot.docs.length);

    // Log each document for debugging
    usersSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`[GET Users] Doc ${index}:`, {
        id: doc.id,
        email: data.email,
        role: data.role,
        displayName: data.displayName,
        name: data.name,
        organizationId: data.organizationId,
        partnerId: data.partnerId,
      });
    });

    // ========================================================================
    // 4. NORMALIZE USER DOCUMENTS
    // ========================================================================
    const users = usersSnapshot.docs.map(doc => {
      const data = doc.data();
      const normalized = normalizeUser(doc.id, data as any);
      console.log('[GET Users] Normalized:', {
        email: normalized.email,
        name: normalized.name,
        hasOrgId: !!normalized.organizationId,
        hasPartnerId: !!normalized.partnerId,
      });
      return normalized;
    });

    console.log('[GET Users] Users after normalization:', users.length);

    // ========================================================================
    // 5. FILTER FOR FIELD OPERATORS WITH REQUIRED ORG FIELDS
    // ========================================================================
    const filteredUsers = roleFilter === 'field_operator'
      ? users.filter(user => {
          const hasRequiredFields = user.organizationId && user.partnerId;
          console.log(`[GET Users] ${user.email} - has required fields: ${hasRequiredFields}`);
          return hasRequiredFields;
        })
      : users;

    console.log('[GET Users] Users after filtering:', filteredUsers.length);
    console.log('[GET Users] Final users:', filteredUsers.map(u => ({ email: u.email, name: u.name })));
    console.log('[GET Users] ============ REQUEST END ============');

    // ========================================================================
    // 6. RETURN RESPONSE
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

