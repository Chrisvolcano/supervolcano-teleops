/**
 * USER DOMAIN TYPES
 * Single source of truth for user-related types
 */

/**
 * USER ROLE TYPE SYSTEM
 * Each role represents a distinct job function with specific permissions
 * DO NOT add generic roles - be explicit about job functions
 */
export type UserRole =
  | "admin"
  | "superadmin"
  | "partner_admin"
  | "partner_manager"
  | "org_manager"
  | "location_owner"
  | "location_cleaner"
  | "oem_teleoperator";

// Type guard for runtime role validation
export function isValidUserRole(role: string): role is UserRole {
  const validRoles: UserRole[] = [
    "admin",
    "superadmin",
    "partner_admin",
    "partner_manager",
    "org_manager",
    "oem_teleoperator",
    "location_owner",
    "location_cleaner",
  ];
  return validRoles.includes(role as UserRole);
}

// Human-readable role labels for UI
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  superadmin: "Super Admin",
  partner_admin: "Partner Admin",
  partner_manager: "Partner Manager",
  org_manager: "Organization Manager",
  oem_teleoperator: "OEM Teleoperator",
  location_owner: "Location Owner",
  location_cleaner: "Location Cleaner",
};

// Role descriptions for UI hints
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "SuperVolcano internal - operational access",
  superadmin: "SuperVolcano internal - full system access",
  partner_admin: "OEM partner admin - manages partner organization",
  partner_manager: "OEM company manager - assigns robot tests",
  org_manager: "Organization manager - manages organization (legacy role)",
  oem_teleoperator: "OEM worker - operates robots remotely",
  location_owner: "Property manager - assigns cleaning tasks",
  location_cleaner: "Cleaning worker - performs cleaning",
};

// Roles grouped by business model for UI organization
export const ROLE_GROUPS = {
  platform: ["admin", "superadmin"] as const,
  oem_b2b: ["partner_admin", "partner_manager", "oem_teleoperator"] as const,
  property_b2c: ["location_owner", "location_cleaner"] as const,
};

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

