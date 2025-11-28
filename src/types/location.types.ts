/**
 * LOCATION TYPE SYSTEM
 * Supports multiple organization assignments per location
 */

import type { OrganizationType } from './organization.types';

export type LocationType = 'test_site' | 'property';

export type OwnerType = 'supervolcano' | 'location_owner';

export interface Location {
  id: string;
  address: string;
  
  // Ownership
  ownedBy: string;               // organizationId
  ownerType: OwnerType;
  
  // Multi-org assignment
  assignedOrganizations: string[]; // Array of organizationIds
  
  // Type
  type: LocationType;
  
  // Metadata
  metadata?: {
    rooms?: number;
    sqft?: number;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  
  created_at: Date;
  updated_at: Date;
}

export interface LocationAssignment {
  locationId: string;
  organizationId: string;
  assignedAt: Date;
  assignedBy: string;            // userId of admin who made assignment
}

// Helper to check if org has access to location
export function hasLocationAccess(location: Location, organizationId: string): boolean {
  return location.assignedOrganizations.includes(organizationId);
}

// Helper to get all orgs with access
export function getAssignedOrganizations(location: Location): string[] {
  return location.assignedOrganizations;
}

