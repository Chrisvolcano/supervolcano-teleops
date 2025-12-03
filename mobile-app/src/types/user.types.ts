/**
 * USER TYPES - Mobile App
 * Must match web app types exactly
 * Last updated: 2025-11-28
 */

export type UserRole = 
  | 'admin'
  | 'superadmin'
  | 'partner_manager'
  | 'location_owner'
  | 'oem_teleoperator'
  | 'location_cleaner';  // ← RENAMED from property_cleaner

// Roles allowed to use mobile app
export const MOBILE_ALLOWED_ROLES: UserRole[] = [
  'location_cleaner',
  'oem_teleoperator',
  'location_owner',
];

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  organizationId: string;  // Prefixed: 'oem:slug' or 'owner:slug'
  created_at: Date;
  updated_at: Date;
}

export interface Location {
  id: string;
  name?: string;  // ← ADDED: location name
  address: string;
  organizationId: string;
  type: 'test_site' | 'property';
  created_at: Date;
  updated_at: Date;
}

export interface Assignment {
  id: string;
  user_id: string;
  location_id: string;
  role: UserRole;
  status: 'active' | 'inactive';
  assigned_by: string;
  assigned_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface VideoUpload {
  id: string;
  userId: string;
  locationId: string;
  organizationId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  fileSize?: number;
  uploadedAt: Date;
  status: 'uploading' | 'completed' | 'failed';
}
