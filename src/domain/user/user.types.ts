/**
 * USER DOMAIN TYPES
 * Single source of truth for user-related types
 */

export type UserRole =
  | "admin"
  | "superadmin"
  | "org_manager"
  | "partner_manager"
  | "location_owner"
  | "field_operator"
  | "teleoperator"
  | "partner_admin";

export interface UserAuthClaims {
  role?: UserRole;
  organizationId?: string;
  teleoperatorId?: string;
}

export interface UserFirestoreData {
  email: string;
  displayName?: string;
  role?: UserRole;
  organizationId?: string;
  teleoperatorId?: string;
  created_at?: Date | { _seconds: number } | string;
  updated_at?: Date | { _seconds: number } | string;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  disabled: boolean;
  lastSignInTime?: string;
  createdAt?: string;
  auth: UserAuthClaims;
  firestore: UserFirestoreData | null;
  syncStatus: "synced" | "auth_only" | "firestore_only" | "mismatched";
  syncIssues: string[];
}

export interface UserUpdateRequest {
  displayName?: string;
  role?: UserRole;
  organizationId?: string;
  teleoperatorId?: string;
  disabled?: boolean;
  syncToAuth?: boolean;
  syncToFirestore?: boolean;
}

export interface UserFilters {
  search?: string;
  role?: UserRole;
  syncStatus?: User["syncStatus"];
  organizationId?: string;
}

