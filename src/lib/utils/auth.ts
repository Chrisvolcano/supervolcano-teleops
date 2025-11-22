/**
 * Authentication utilities
 * Server-side helpers for role-based access control
 */

import { adminAuth } from "@/lib/firebaseAdmin";
import type { UserRole, UserClaims } from "@/lib/types";

/**
 * Get user claims from Firebase Auth token
 * Use this in API routes and server components
 */
export async function getUserClaims(token: string): Promise<UserClaims | null> {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return {
      role: decodedToken.role as UserRole,
      partnerId: decodedToken.partnerId as string | undefined,
      teleoperatorId: decodedToken.teleoperatorId as string | undefined,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Require specific role
 * Throws error if user doesn't have required role
 */
export function requireRole(claims: UserClaims | null, requiredRole: UserRole): void {
  if (!claims) {
    throw new Error("Unauthorized: No authentication claims");
  }

  if (claims.role !== requiredRole && claims.role !== "superadmin") {
    throw new Error(`Unauthorized: Requires ${requiredRole} role`);
  }
}

/**
 * Check if user has access to partner data
 */
export function canAccessPartner(claims: UserClaims | null, partnerId: string): boolean {
  if (!claims) {
    return false;
  }

  // Superadmins can access all partners
  if (claims.role === "superadmin") {
    return true;
  }

  // Partner admins and teleoperators can only access their own partner
  return claims.partnerId === partnerId;
}

/**
 * Get partner ID from claims (for filtering queries)
 */
export function getPartnerId(claims: UserClaims | null): string | undefined {
  if (!claims) {
    return undefined;
  }

  // Superadmins don't have partner restrictions
  if (claims.role === "superadmin") {
    return undefined;
  }

  return claims.partnerId;
}

