/**
 * USER TYPES
 * Standardized user model with field normalization
 * Last updated: 2025-11-26
 */

export type UserRole = 
  | 'admin' 
  | 'partner_manager' 
  | 'property_owner' 
  | 'field_operator';

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
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
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

