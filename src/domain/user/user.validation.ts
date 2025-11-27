/**
 * USER VALIDATION RULES
 * Single source of truth for user validation logic
 */
import type { UserRole } from "./user.types";

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

    const validRoles: UserRole[] = [
      "admin",
      "superadmin",
      "org_manager",
      "partner_manager",
      "location_owner",
      "field_operator",
      "teleoperator",
      "partner_admin",
    ];

    if (!validRoles.includes(role as UserRole)) {
      return {
        valid: false,
        errors: ["Invalid role selected"],
      };
    }

    return { valid: true, errors: [] };
  }

  static validateOrganizationId(
    organizationId: string,
    role: UserRole | "",
  ): ValidationResult {
    const rolesRequiringOrg: UserRole[] = [
      "partner_manager",
      "location_owner",
      "field_operator",
      "org_manager",
      "teleoperator",
      "partner_admin",
    ];

    if (rolesRequiringOrg.includes(role as UserRole) && !organizationId) {
      return {
        valid: false,
        errors: [`Organization ID is required for ${role} role`],
      };
    }

    // Accept both UUIDs and slugs (alphanumeric with hyphens)
    if (organizationId && !this.isValidOrganizationId(organizationId)) {
      return {
        valid: false,
        errors: [
          'Organization ID must be a valid UUID or slug (e.g., "demo-org" or "94c8ed66-...")',
        ],
      };
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

