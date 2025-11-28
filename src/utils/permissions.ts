/**
 * PERMISSION HELPERS
 * Centralized role checking logic
 */

import type { UserRole } from "@/domain/user/user.types";

export class PermissionUtils {
  /**
   * Check if user is a field worker (any type)
   */
  static isFieldWorker(role: UserRole | string): boolean {
    return role === "oem_teleoperator" || role === "location_cleaner";
  }

  /**
   * Check if user is an admin (any level)
   */
  static isAdmin(role: UserRole | string): boolean {
    return role === "admin" || role === "superadmin";
  }

  /**
   * Check if user is a manager (any type)
   */
  static isManager(role: UserRole | string): boolean {
    return role === "partner_manager" || role === "location_owner";
  }

  /**
   * Check if user is OEM-related
   */
  static isOEMRole(role: UserRole | string): boolean {
    return role === "partner_manager" || role === "oem_teleoperator";
  }

  /**
   * Check if user is property-related
   */
  static isPropertyRole(role: UserRole | string): boolean {
    return role === "location_owner" || role === "location_cleaner";
  }

  /**
   * Check if role requires organization assignment
   */
  static requiresOrganization(role: UserRole | string): boolean {
    return !this.isAdmin(role);
  }
}

