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

/**
 * Normalize role field - handles legacy 'teleoperator' → 'field_operator'
 */
function normalizeRole(role: string | undefined): UserRole | undefined {
  if (!role) return undefined;
  
  // Handle legacy 'teleoperator' → 'field_operator'
  if (role === 'teleoperator') return 'field_operator';
  
  return role as UserRole;
}

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
    // For field_operator, we need to query all users and filter
    // because we need to handle both 'field_operator' and legacy 'teleoperator'
    let usersQuery = adminDb.collection('users');
    
    if (roleFilter && roleFilter !== 'field_operator') {
      console.log('[GET Users] Applying role filter:', roleFilter);
      usersQuery = usersQuery.where('role', '==', roleFilter) as any;
    } else if (roleFilter === 'field_operator') {
      console.log('[GET Users] Querying all users to filter by role (handles legacy teleoperator)');
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
    // 4. NORMALIZE USER DOCUMENTS (with role normalization)
    // ========================================================================
    const users = usersSnapshot.docs
      .map(doc => {
        const data = doc.data();
        const normalizedRole = normalizeRole(data.role);
        
        // Normalize user with corrected role
        return normalizeUser(doc.id, {
          ...data,
          role: normalizedRole || data.role, // Use normalized role
        } as any);
      })
      .filter(user => {
        // Filter by normalized role
        if (roleFilter === 'field_operator') {
          const matchesRole = user.role === 'field_operator';
          const hasRequiredFields = !!(user.organizationId && user.partnerId);
          const shouldInclude = matchesRole && hasRequiredFields;
          console.log(`[GET Users] ${user.email} - role: ${user.role}, has org fields: ${hasRequiredFields}, include: ${shouldInclude}`);
          return shouldInclude;
        }
        if (roleFilter) {
          return user.role === roleFilter;
        }
        return true;
      });

    console.log('[GET Users] Users after normalization and filtering:', users.length);

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

