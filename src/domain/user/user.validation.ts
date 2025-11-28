/**
 * USER VALIDATION RULES
 * Single source of truth for user validation logic
 */
import type { UserRole } from "./user.types";
import { getOrganizationTypeForRole } from "@/types/organization.types";
import { ROLE_LABELS, isValidUserRole } from "./user.types";
import type { OrganizationType } from "@/types/organization.types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class UserValidator {
  static validateRole(role: UserRole | ""): ValidationResult {
    if (!role) {
      return {
        valid: false,
        errors: ["Role is required"],
      };
    }

    if (!isValidUserRole(role)) {
      return {
        valid: false,
        errors: ["Invalid role selected"],
      };
    }

    return { valid: true, errors: [] };
  }

  // Roles that require an organization assignment
  private static readonly ROLES_REQUIRING_ORG: UserRole[] = [
    "partner_manager",
    "oem_teleoperator",
    "location_owner",
    "location_cleaner",
  ];

  static validateOrganizationId(
    organizationId: string,
    role: UserRole | "",
  ): ValidationResult {
    // Check if role requires org
    if (!role || role === "admin" || role === "superadmin") {
      // Admins don't need explicit org (they're always sv:internal)
      return { valid: true, errors: [] };
    }

    if (
      this.ROLES_REQUIRING_ORG.includes(role as UserRole) &&
      !organizationId
    ) {
      const roleLabel = role ? ROLE_LABELS[role as UserRole] : role;
      return {
        valid: false,
        errors: [`Organization is required for ${roleLabel} role`],
      };
    }

    // Validate organization ID format
    if (organizationId && !this.isValidOrganizationId(organizationId)) {
      return {
        valid: false,
        errors: [
          "Organization ID must be in format: sv:slug, oem:slug, or owner:slug",
        ],
      };
    }

    // Validate org type matches role
    if (organizationId && role && isValidUserRole(role)) {
      const [prefix] = organizationId.split(":");

      const expectedOrgType = getOrganizationTypeForRole(role);

      const prefixToType: Record<string, OrganizationType> = {
        sv: "supervolcano",
        oem: "oem_partner",
        owner: "location_owner",
      };

      const actualOrgType = prefixToType[prefix];

      if (expectedOrgType && actualOrgType !== expectedOrgType) {
        return {
          valid: false,
          errors: [
            `Role ${ROLE_LABELS[role]} requires organization type ${expectedOrgType}, but got ${actualOrgType}`,
          ],
        };
      }
    }

    return { valid: true, errors: [] };
  }

  static validateDisplayName(displayName: string): ValidationResult {
    if (displayName && displayName.length > 100) {
      return {
        valid: false,
        errors: ["Display name must be less than 100 characters"],
      };
    }

    return { valid: true, errors: [] };
  }

  static validateUserUpdate(data: {
    displayName?: string;
    role: UserRole | "";
    organizationId: string;
  }): ValidationResult {
    const errors: string[] = [];

    const roleValidation = this.validateRole(data.role);
    if (!roleValidation.valid) {
      errors.push(...roleValidation.errors);
    }

    const orgValidation = this.validateOrganizationId(
      data.organizationId,
      data.role,
    );
    if (!orgValidation.valid) {
      errors.push(...orgValidation.errors);
    }

    const nameValidation = this.validateDisplayName(data.displayName || "");
    if (!nameValidation.valid) {
      errors.push(...nameValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private static isValidOrganizationId(id: string): boolean {
    // Accept prefixed format: sv:slug, oem:slug, owner:slug
    const prefixedRegex = /^(sv|oem|owner):[a-z0-9-]{2,50}$/;
    if (prefixedRegex.test(id)) return true;

    // Still accept UUID format for backward compatibility
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) return true;

    // Accept simple slugs for backward compatibility
    const slugRegex = /^[a-z0-9-]{2,50}$/;
    return slugRegex.test(id);
  }

  private static isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

