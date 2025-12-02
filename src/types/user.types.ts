/**
 * USER TYPES
 * Standardized user model with Firestore timestamp handling
 * Last updated: 2025-11-26
 */

export type UserRole = 
  | 'admin'
  | 'superadmin'
  | 'partner_admin'
  | 'partner_manager'
  | 'org_manager'
  | 'location_owner'
  | 'location_cleaner'
  | 'oem_teleoperator';

// Firestore Timestamp type (simplified)
interface FirestoreTimestamp {
  toDate(): Date;
  seconds: number;
  nanoseconds: number;
}

export interface FirestoreUserDocument {
  // Standard fields
  email: string;
  role: UserRole;
  displayName?: string;  // Preferred field
  name?: string;         // Legacy field (backwards compatibility)
  
  // Organization fields
  organizationId?: string;
  partnerId?: string;
  teleoperatorId?: string | null;
  
  // Timestamps - Firestore Timestamp objects OR JavaScript Dates
  created_at: FirestoreTimestamp | Date;
  updated_at: FirestoreTimestamp | Date;
}

export interface User {
  id: string;
  email: string;
  name: string;  // Normalized output (from displayName or name)
  role: UserRole;
  organizationId?: string;
  partnerId?: string;
  teleoperatorId?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserListResponse {
  success: boolean;
  users: User[];
}

