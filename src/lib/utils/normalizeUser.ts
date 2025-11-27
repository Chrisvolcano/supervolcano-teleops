/**
 * USER NORMALIZATION UTILITY
 * Handles field name inconsistencies and provides type-safe user objects
 * Last updated: 2025-11-26
 */

import type { FirestoreUserDocument, User } from '@/types/user.types';

/**
 * Normalize user document from Firestore to consistent User type
 * Handles both 'displayName' and legacy 'name' fields
 */
export function normalizeUser(
  id: string,
  data: FirestoreUserDocument
): User {
  // Prefer displayName, fall back to name, default to email username
  const name = data.displayName 
    || data.name 
    || data.email.split('@')[0] 
    || 'Unknown User';

  return {
    id,
    email: data.email,
    name,
    role: data.role,
    organizationId: data.organizationId,
    partnerId: data.partnerId,
    teleoperatorId: data.teleoperatorId,
    created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
    updated_at: data.updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}

/**
 * Validate that user has required organization fields for assignment
 */
export function canBeAssigned(user: User): boolean {
  return !!(
    user.role === 'field_operator' &&
    user.organizationId &&
    user.partnerId
  );
}

/**
 * Get display name with fallback logic
 */
export function getDisplayName(data: FirestoreUserDocument): string {
  return data.displayName 
    || data.name 
    || data.email.split('@')[0] 
    || 'Unknown User';
}

