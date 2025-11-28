/**
 * SUPERVOLCANO PERMISSIONS SYSTEM
 * 
 * This module defines what each role can do in the system.
 * 
 * Architecture:
 * - Permissions are capabilities (e.g., "CREATE_LOCATIONS")
 * - Each permission lists which roles have it
 * - Middleware functions enforce permissions at API layer
 * 
 * Usage in API routes:
 * ```typescript
 * await requirePermission(userId, 'CREATE_LOCATIONS');
 * ```
 * 
 * Last updated: 2025-01-26
 */

import { UserRole, User } from '@/types/database';

// ============================================================================
// PERMISSION DEFINITIONS
// ============================================================================

/**
 * All permissions in the system.
 * 
 * Each permission is a key with an array of roles that have it.
 * 
 * Naming convention: VERB_NOUN
 * Examples: CREATE_LOCATIONS, VIEW_ANALYTICS, INVITE_WORKERS
 */
export const Permissions = {
  // -------------------------------------------------------------------------
  // LOCATION MANAGEMENT
  // -------------------------------------------------------------------------
  
  /**
   * Create test locations for OEM partners.
   * These locations are owned by SuperVolcano and assigned to partners.
   * 
   * Who has it: admin only
   */
  CREATE_TEST_LOCATIONS: ['admin'] as UserRole[],
  
  /**
   * Create personal properties.
   * These locations are owned by the creator.
   * 
   * Who has it: location_owner only (+ admin for testing)
   */
  CREATE_OWN_LOCATIONS: ['admin', 'location_owner'] as UserRole[],
  
  /**
   * Edit any location's details.
   * 
   * Who has it: admin (all locations), location_owner (own locations only)
   * Note: Additional check required to verify ownership for location_owner
   */
  EDIT_LOCATIONS: ['admin', 'location_owner'] as UserRole[],
  
  /**
   * Delete locations.
   * 
   * Who has it: admin (all locations), location_owner (own locations only)
   * Note: Additional check required to verify ownership for location_owner
   */
  DELETE_LOCATIONS: ['admin', 'location_owner'] as UserRole[],
  
  /**
   * View locations.
   * Different roles see different subsets:
   * - admin: ALL locations
   * - partner_manager: Locations assigned to their organization
   * - location_owner: Locations they created
   * - oem_teleoperator: Locations assigned to their OEM organization
   * - location_cleaner: Locations they're assigned to work at
   * 
   * Who has it: Everyone (scoped differently)
   */
  VIEW_LOCATIONS: ['admin', 'partner_manager', 'location_owner', 'oem_teleoperator', 'location_cleaner'] as UserRole[],
  
  // -------------------------------------------------------------------------
  // ORGANIZATION MANAGEMENT
  // -------------------------------------------------------------------------
  
  /**
   * Assign test locations to partner organizations.
   * 
   * Who has it: admin only
   */
  ASSIGN_LOCATIONS_TO_ORGS: ['admin'] as UserRole[],
  
  /**
   * Create organizations.
   * 
   * Who has it: admin (creates partner orgs), location_owner (self-signup)
   */
  CREATE_ORGANIZATIONS: ['admin', 'location_owner'] as UserRole[],
  
  /**
   * Manage all organizations in the system.
   * 
   * Who has it: admin only
   */
  MANAGE_ALL_ORGS: ['admin'] as UserRole[],
  
  // -------------------------------------------------------------------------
  // WORKER MANAGEMENT
  // -------------------------------------------------------------------------
  
  /**
   * Generate invite codes for field workers.
   * 
   * Who has it: Managers (both partner_manager and location_owner)
   */
  INVITE_FIELD_OPERATORS: ['admin', 'partner_manager', 'location_owner'] as UserRole[],
  
  /**
   * Assign field workers to specific locations.
   * 
   * Who has it: Managers
   */
  ASSIGN_WORKERS: ['admin', 'partner_manager', 'location_owner'] as UserRole[],
  
  /**
   * View team members (field workers in organization).
   * 
   * Who has it: Managers
   */
  VIEW_TEAM: ['admin', 'partner_manager', 'location_owner'] as UserRole[],
  
  // -------------------------------------------------------------------------
  // TASK OPERATIONS
  // -------------------------------------------------------------------------
  
  /**
   * Create and edit tasks/actions.
   * 
   * Who has it: Location creators and admins
   */
  MANAGE_TASKS: ['admin', 'location_owner'] as UserRole[],
  
  /**
   * Record videos for task completion.
   * 
   * Who has it: Field workers only (OEM teleoperators and location cleaners)
   */
  RECORD_VIDEOS: ['oem_teleoperator', 'location_cleaner'] as UserRole[],
  
  /**
   * Mark tasks as complete.
   * 
   * Who has it: Field workers (OEM teleoperators and location cleaners)
   */
  COMPLETE_TASKS: ['oem_teleoperator', 'location_cleaner'] as UserRole[],
  
  // -------------------------------------------------------------------------
  // ANALYTICS
  // -------------------------------------------------------------------------
  
  /**
   * View performance analytics.
   * Different roles see different data:
   * - admin: Platform-wide analytics
   * - partner_manager: Their team's performance at assigned locations
   * - location_owner: Cleaning performance at their properties
   * 
   * Who has it: Admins and managers
   */
  VIEW_ANALYTICS: ['admin', 'partner_manager', 'location_owner'] as UserRole[],
  
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * Type-safe permission keys.
 * Use this in function signatures to ensure valid permission checks.
 */
export type Permission = keyof typeof Permissions;

// ============================================================================
// PERMISSION CHECKING FUNCTIONS
// ============================================================================

/**
 * Check if a role has a specific permission.
 * 
 * This is a pure function - no database access.
 * Use this for quick in-memory checks.
 * 
 * @param userRole - The role to check
 * @param permission - The permission to check for
 * @returns true if role has permission, false otherwise
 * 
 * @example
 * ```typescript
 * if (hasPermission('location_owner', 'CREATE_OWN_LOCATIONS')) {
 *   // Allow location creation
 * }
 * ```
 */
export function hasPermission(
  userRole: UserRole,
  permission: Permission
): boolean {
  return Permissions[permission].includes(userRole);
}

/**
 * Require that a user has a specific permission.
 * 
 * This function:
 * 1. Fetches user from database
 * 2. Checks if their role has the permission
 * 3. Throws error if not authorized
 * 
 * Use this in API route handlers to enforce permissions.
 * 
 * @param user - User object with role
 * @param permission - Required permission
 * @throws Error if user doesn't have permission
 * @returns true if user has permission
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const user = await getUser(session.user.id);
 *   await requirePermission(user, 'CREATE_LOCATIONS');
 *   // ... proceed with location creation
 * }
 * ```
 */
export async function requirePermission(
  user: User,
  permission: Permission
): Promise<boolean> {
  if (!user) {
    throw new Error('Unauthorized: User not found');
  }
  
  // Check if user's role has this permission
  if (!hasPermission(user.role, permission)) {
    throw new Error(
      `Forbidden: Role '${user.role}' does not have permission '${permission}'`
    );
  }
  
  return true;
}

/**
 * Check if user can access a specific location.
 * 
 * This is more complex than role-based permissions because access
 * depends on relationships in the database:
 * - Admins can access all locations
 * - Partner managers can access locations assigned to their org
 * - Property owners can access locations they created
 * - Field operators can access locations they're assigned to
 * 
 * @param user - User to check
 * @param locationId - Location to access
 * @param location - Location object (optional, will be fetched if not provided)
 * @param getLocationAssignment - Function to check org assignment (optional)
 * @param getUserLocationAssignment - Function to check user assignment (optional)
 * @returns true if user can access location, false otherwise
 * 
 * @example
 * ```typescript
 * const canAccess = await canAccessLocation(user, locationId, location);
 * if (!canAccess) {
 *   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 * }
 * ```
 */
export async function canAccessLocation(
  user: User,
  locationId: string,
  location?: { owned_by: string | null; organization_id: string } | null,
  getLocationAssignment?: (orgId: string, locId: string) => Promise<boolean>,
  getUserLocationAssignment?: (userId: string, locId: string) => Promise<boolean>
): Promise<boolean> {
  if (!user) return false;
  
  // Admin can access everything
  if (user.role === 'admin') return true;
  
  // Location owner can access locations they created
  if (user.role === 'location_owner') {
    if (!location) {
      // If location not provided, we can't check ownership
      // In real implementation, fetch location here
      return false;
    }
    return location.owned_by === user.id;
  }
  
  // Partner manager can access locations assigned to their org
  if (user.role === 'partner_manager') {
    if (!user.organization_id) return false;
    if (getLocationAssignment) {
      return await getLocationAssignment(user.organization_id, locationId);
    }
    // If helper not provided, check organization_id match
    if (location) {
      return location.organization_id === user.organization_id;
    }
    return false;
  }
  
  // Field workers can access locations they're assigned to
  if (user.role === 'oem_teleoperator' || user.role === 'location_cleaner') {
    if (getUserLocationAssignment) {
      return await getUserLocationAssignment(user.id, locationId);
    }
    // If helper not provided, we can't check assignment
    return false;
  }
  
  return false;
}

