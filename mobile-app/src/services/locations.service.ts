/**
 * LOCATIONS SERVICE - Mobile App
 * Fetches locations assigned to user's organization
 * Aligned with web app architecture (uses assignedOrganizationId)
 * Last updated: 2025-12-01
 */

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Location } from '@/types/user.types';

export class LocationsService {
  /**
   * Fetch locations assigned to user's organization
   * @param organizationId - The user's organizationId from their profile
   */
  static async getAssignedLocations(organizationId: string): Promise<Location[]> {
    try {
      if (!organizationId) {
        console.warn('[LocationsService] No organizationId provided');
        return [];
      }

      console.log('[LocationsService] Fetching locations for org:', organizationId);
      
      const locationsRef = collection(db, 'locations');
      const locationsQuery = query(
        locationsRef,
        where('assignedOrganizationId', '==', organizationId)
      );
      const snapshot = await getDocs(locationsQuery);
      
      if (snapshot.empty) {
        console.log('[LocationsService] No locations found for org:', organizationId);
        return [];
      }

      console.log('[LocationsService] Found', snapshot.size, 'locations');

      const locations: Location[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || 'Unnamed Location',
          address: data.address || data.addressData?.fullAddress || '',
          organizationId: data.assignedOrganizationId || '',
          type: data.type || 'property',
          created_at: data.createdAt?.toDate?.() || data.created_at?.toDate?.() || new Date(),
          updated_at: data.updatedAt?.toDate?.() || data.updated_at?.toDate?.() || new Date(),
        };
      });

      // Sort alphabetically by name
      locations.sort((a, b) => a.name.localeCompare(b.name));

      console.log('[LocationsService] Returning', locations.length, 'locations');
      return locations;

    } catch (error: any) {
      console.error('[LocationsService] Error fetching locations:', error);
      throw new Error('Failed to load locations. Please check your connection and try again.');
    }
  }

  /**
   * Get single location by ID
   */
  static async getLocation(locationId: string): Promise<Location | null> {
    try {
      const docRef = doc(db, 'locations', locationId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || 'Unnamed Location',
        address: data.address || data.addressData?.fullAddress || '',
        organizationId: data.assignedOrganizationId || '',
        type: data.type || 'property',
        created_at: data.createdAt?.toDate?.() || data.created_at?.toDate?.() || new Date(),
        updated_at: data.updatedAt?.toDate?.() || data.updated_at?.toDate?.() || new Date(),
      };
    } catch (error) {
      console.error('[LocationsService] Error fetching location:', error);
      return null;
    }
  }
}
