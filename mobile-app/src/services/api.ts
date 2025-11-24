import { firestore } from '../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Location, Job } from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

/**
 * Fetch all locations from Firestore
 */
export async function fetchLocations(): Promise<Location[]> {
  try {
    const locationsSnap = await getDocs(collection(firestore, 'locations'));
    
    return locationsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Location));
  } catch (error) {
    console.error('Failed to fetch locations:', error);
    throw error;
  }
}

/**
 * Fetch jobs for a specific location from Firestore
 */
export async function fetchJobsForLocation(locationId: string): Promise<Job[]> {
  try {
    const q = query(
      collection(firestore, 'tasks'),
      where('locationId', '==', locationId)
    );
    
    const jobsSnap = await getDocs(q);
    
    return jobsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Job));
  } catch (error) {
    console.error('Failed to fetch jobs:', error);
    throw error;
  }
}

/**
 * Save media metadata via existing API
 */
export async function saveMediaMetadata(data: {
  taskId: string;
  locationId: string;
  storageUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  durationSeconds?: number;
}) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/media/metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId: data.taskId,
        locationId: data.locationId,
        mediaType: 'video',
        storageUrl: data.storageUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        durationSeconds: data.durationSeconds,
      }),
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to save metadata');
    }
    
    return result;
  } catch (error) {
    console.error('Failed to save media metadata:', error);
    throw error;
  }
}

