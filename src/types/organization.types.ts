/**
 * ORGANIZATION TYPES
 * Centralized organization type definitions
 */

export type OrganizationType =
  | "supervolcano" // Internal SuperVolcano team
  | "oem_partner" // Robotics companies (Figure, Tesla, etc.)
  | "location_owner"; // Property owners/managers

export interface Organization {
  id: string; // Prefixed: 'sv:internal', 'oem:figure-ai', 'owner:acme-properties'
  name: string; // Display name: 'Figure AI', 'Acme Properties'
  type: OrganizationType; // Business model type
  slug: string; // URL-friendly: 'figure-ai', 'acme-properties'
  created_at: Date;
  updated_at: Date;

  // Optional metadata
  contactEmail?: string;
  contactPhone?: string;
  billingStatus?: "active" | "suspended" | "trial";
  metadata?: Record<string, any>;
}

export interface CreateOrganizationRequest {
  name: string;
  type: OrganizationType;
  slug: string;
  contactEmail?: string;
  contactPhone?: string;
}

// Helper to generate prefixed ID from slug
export function generateOrganizationId(
  type: OrganizationType,
  slug: string,
): string {
  const prefix = {
    supervolcano: "sv",
    oem_partner: "oem",
    location_owner: "owner",
  }[type];

  return `${prefix}:${slug}`;
}

// Helper to parse organization ID
export function parseOrganizationId(id: string): {
  type: string;
  slug: string;
} | null {
  const match = id.match(/^(sv|oem|owner):(.+)$/);
  if (!match) return null;

  return {
    type: match[1],
    slug: match[2],
  };
}

import type { UserRole } from "@/domain/user/user.types";

/**
 * Maps user roles to their required organization types
 * This enforces the business model separation at the type level
 */
export function getOrganizationTypeForRole(
  role: UserRole,
): OrganizationType | null {
  // Type-safe mapping with exhaustive checking
  switch (role) {
    case "admin":
    case "superadmin":
      return "supervolcano";

    case "partner_admin":
    case "partner_manager":
    case "org_manager":
    case "oem_teleoperator":
      return "oem_partner";

    case "location_owner":
    case "location_cleaner":
      return "location_owner";

    default:
      // TypeScript will error if we add a new role and forget to handle it
      const _exhaustiveCheck: never = role;
      return null;
  }
}

/**
 * Validates that a role is compatible with an organization type
 * Used in API validation
 */
export function isRoleCompatibleWithOrgType(
  role: UserRole,
  orgType: OrganizationType,
): boolean {
  const requiredType = getOrganizationTypeForRole(role);
  return requiredType === orgType;
}

