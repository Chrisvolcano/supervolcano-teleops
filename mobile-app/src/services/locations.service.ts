/**
 * LOCATIONS SERVICE - Mobile App
 * Fetches locations assigned to current user via assignments collection
 * Aligned with web app architecture as of 2025-11-28
 */

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  orderBy 
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Location, Assignment } from '@/types/user.types';

export class LocationsService {
  /**
   * Fetch locations assigned to user via assignments collection
   * Step 1: Query assignments where user_id = userId and status = 'active'
   * Step 2: Fetch each location document
   */
  static async getAssignedLocations(userId: string): Promise<Location[]> {
    try {
      console.log('[LocationsService] Fetching assignments for user:', userId);
      
      // Step 1: Get active assignments for this user
      const assignmentsRef = collection(db, 'assignments');
      const assignmentsQuery = query(
        assignmentsRef,
        where('user_id', '==', userId),
        where('status', '==', 'active')
      );
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      
      if (assignmentsSnapshot.empty) {
        console.log('[LocationsService] No assignments found for user');
        return [];
      }

      console.log('[LocationsService] Found', assignmentsSnapshot.size, 'assignments');

      // Step 2: Extract location IDs
      const locationIds = assignmentsSnapshot.docs.map(
        (doc) => doc.data().location_id as string
      );

      // Step 3: Fetch each location document
      const locations: Location[] = [];
      for (const locationId of locationIds) {
        try {
          const locationDoc = await getDoc(doc(db, 'locations', locationId));
          
          if (locationDoc.exists()) {
            const data = locationDoc.data();
            locations.push({
              id: locationDoc.id,
              name: data.name || data.address || 'Unnamed Location',
              address: data.address || '',
              organizationId: data.organizationId || '',
              type: data.type || 'property',
              created_at: data.created_at?.toDate?.() || new Date(),
              updated_at: data.updated_at?.toDate?.() || new Date(),
            });
          } else {
            console.warn('[LocationsService] Location not found:', locationId);
          }
        } catch (err) {
          console.error('[LocationsService] Error fetching location:', locationId, err);
        }
      }

      // Sort by address
      locations.sort((a, b) => a.address.localeCompare(b.address));

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
        name: data.name || data.address || 'Unnamed Location',
        address: data.address || '',
        organizationId: data.organizationId || '',
        type: data.type || 'property',
        created_at: data.created_at?.toDate?.() || new Date(),
        updated_at: data.updated_at?.toDate?.() || new Date(),
      };
    } catch (error) {
      console.error('[LocationsService] Error fetching location:', error);
      return null;
    }
  }
}
