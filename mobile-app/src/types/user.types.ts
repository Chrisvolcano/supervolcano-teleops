/**
 * USER TYPES - Mobile App
 * Must match web app types exactly
 */

export type UserRole = 
  | 'admin'
  | 'superadmin'
  | 'partner_manager'
  | 'location_owner'
  | 'oem_teleoperator'
  | 'property_cleaner';

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
  address: string;
  organizationId: string;
  type: 'test_site' | 'property';
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

