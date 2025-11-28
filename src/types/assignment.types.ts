/**
 * ASSIGNMENT TYPES
 * Type-safe assignments for location-to-user relationships
 * Last updated: 2025-11-26
 */

export type AssignmentStatus = 'active' | 'inactive';

export type AssignmentRole = 'oem_teleoperator' | 'location_cleaner' | 'location_owner' | 'partner_manager';

export interface Assignment {
  id: string;
  user_id: string;
  location_id: string;
  assigned_by: string;
  assigned_at: Date;
  status: AssignmentStatus;
  role: AssignmentRole;
  created_at: Date;
  updated_at: Date;
}

export interface AssignmentWithUser extends Assignment {
  user_name: string;
  user_email: string;
}

export interface CreateAssignmentRequest {
  user_id: string;
  location_id: string;
  role: AssignmentRole;
}

