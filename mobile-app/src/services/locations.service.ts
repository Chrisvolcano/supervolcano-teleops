/**
 * LOCATIONS SERVICE - Mobile App
 * Fetches locations assigned to current user's organization
 */

import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Location } from '@/types/user.types';

export class LocationsService {
  /**
   * Fetch locations assigned to user's organization
   * Only returns locations where organizationId matches user's org
   */
  static async getAssignedLocations(organizationId: string): Promise<Location[]> {
    try {
      const locationsRef = collection(db, 'locations');
      const q = query(
        locationsRef,
        where('organizationId', '==', organizationId),
        orderBy('address', 'asc')
      );

      const snapshot = await getDocs(q);
      
      const locations: Location[] = snapshot.docs.map(doc => ({
        id: doc.id,
        address: doc.data().address,
        organizationId: doc.data().organizationId,
        type: doc.data().type || 'property',
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      }));

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

      return {
        id: docSnap.id,
        address: docSnap.data().address,
        organizationId: docSnap.data().organizationId,
        type: docSnap.data().type || 'property',
        created_at: docSnap.data().created_at?.toDate() || new Date(),
        updated_at: docSnap.data().updated_at?.toDate() || new Date(),
      };
    } catch (error) {
      console.error('[LocationsService] Error fetching location:', error);
      return null;
    }
  }
}

