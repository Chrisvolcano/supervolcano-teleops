/**
 * Authentication utilities
 * Server-side helpers for role-based access control
 */

import { adminAuth } from "@/lib/firebaseAdmin";
import type { UserRole } from "@/types/user.types";

// UserClaims interface for authentication utilities
export interface UserClaims {
  role: UserRole;
  partnerId?: string;
  teleoperatorId?: string;
  organizationId?: string;
}

/**
 * Get user claims from Firebase Auth token
 * Use this in API routes and server components
 */
export async function getUserClaims(token: string): Promise<UserClaims | null> {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Firebase Admin SDK puts custom claims directly on the decoded token
    // Access them directly from decodedToken (not decodedToken.claims)
    const role = (decodedToken as any).role as UserRole | undefined;
    const partnerId = (decodedToken as any).partnerId as string | undefined;
    const teleoperatorId = (decodedToken as any).teleoperatorId as string | undefined;
    const organizationId = (decodedToken as any).organizationId as string | undefined;
    
    console.log("[auth] getUserClaims - Decoded token:", {
      uid: decodedToken.uid,
      role,
      partnerId,
      teleoperatorId,
      organizationId,
      hasRole: !!role,
    });
    
    if (!role) {
      console.warn("[auth] getUserClaims - No role found in token. User may need to sign out and sign back in.");
      // Return null if no role - this will trigger unauthorized error
      return null;
    }
    
    return {
      role,
      partnerId: partnerId || undefined,
      teleoperatorId: teleoperatorId || undefined,
      organizationId: organizationId || undefined,
    };
  } catch (error: any) {
    console.error("[auth] getUserClaims - Error verifying token:", {
      message: error.message,
      code: error.code,
    });
    return null;
  }
}

/**
 * Require specific role(s)
 * Throws error if user doesn't have required role
 */
export function requireRole(claims: UserClaims | null, allowedRoles: UserRole | UserRole[]): void {
  if (!claims) {
    throw new Error("Unauthorized: No authentication claims");
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  // Superadmin has access to everything
  if (claims.role === "superadmin") {
    return;
  }
  
  if (!roles.includes(claims.role)) {
    const rolesStr = roles.join(" or ");
    throw new Error(`Unauthorized: Requires ${rolesStr} role`);
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

