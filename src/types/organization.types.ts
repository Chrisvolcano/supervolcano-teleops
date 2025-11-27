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

// Helper to get organization type from role
export function getOrganizationTypeForRole(
  role: string,
): OrganizationType | null {
  switch (role) {
    case "admin":
    case "superadmin":
      return "supervolcano";
    case "partner_manager":
      return "oem_partner";
    case "location_owner":
      return "location_owner";
    case "field_operator":
      return null; // Field operators can belong to either OEM or location owner
    default:
      return null;
  }
}

