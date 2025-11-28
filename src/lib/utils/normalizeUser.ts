/**
 * USER NORMALIZATION UTILITY
 * Type-safe handling of Firestore Timestamps and field inconsistencies
 * Last updated: 2025-11-26
 */

import type { FirestoreUserDocument, User } from '@/types/user.types';

/**
 * Convert Firestore Timestamp or Date to ISO string
 */
function toISOString(timestamp: any): string {
  if (!timestamp) {
    return new Date().toISOString();
  }
  
  // Handle Firestore Timestamp (has toDate method)
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  
  // Handle JavaScript Date
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  
  // Fallback
  return new Date().toISOString();
}

/**
 * Normalize user document from Firestore to consistent User type
 * Handles both 'displayName' and legacy 'name' fields
 * Handles Firestore Timestamps and JavaScript Dates
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
    created_at: toISOString(data.created_at),
    updated_at: toISOString(data.updated_at),
  };
}

/**
 * Validate that user has required organization fields for assignment
 */
export function canBeAssigned(user: User): boolean {
  return !!(
    (user.role === 'oem_teleoperator' || user.role === 'location_cleaner') &&
    user.organizationId
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

