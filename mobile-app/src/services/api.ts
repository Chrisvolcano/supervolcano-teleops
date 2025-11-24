import { firestore } from '../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Location, Job } from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

/**
 * Fetch all locations from Firestore
 */
export async function fetchLocations(): Promise<Location[]> {
  try {
    console.log('📍 Fetching locations from Firestore...');
    
    // Check if firestore is initialized
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }
    
    const locationsSnap = await getDocs(collection(firestore, 'locations'));
    console.log(`📍 Found ${locationsSnap.size} locations in Firestore`);
    
    const locations = locationsSnap.docs.map(doc => {
      const data = doc.data();
      console.log(`📍 Location: ${data.name} (${doc.id})`);
      return {
        id: doc.id,
        ...data
      } as Location;
    });
    
    return locations;
  } catch (error: any) {
    console.error('❌ Failed to fetch locations:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    throw error;
  }
}

/**
 * Fetch jobs for a specific location from Firestore
 */
export async function fetchJobsForLocation(locationId: string): Promise<Job[]> {
  try {
    console.log(`💼 Fetching jobs for location: ${locationId}`);
    
    const q = query(
      collection(firestore, 'tasks'),
      where('locationId', '==', locationId)
    );
    
    const jobsSnap = await getDocs(q);
    console.log(`💼 Found ${jobsSnap.size} jobs`);
    
    const jobs = jobsSnap.docs.map(doc => {
      const data = doc.data();
      console.log(`💼 Job: ${data.title} (${doc.id})`);
      return {
        id: doc.id,
        ...data
      } as Job;
    });
    
    return jobs;
  } catch (error: any) {
    console.error('❌ Failed to fetch jobs:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
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
    console.log('💾 Saving media metadata...');
    console.log('💾 API URL:', `${API_BASE_URL}/api/admin/media/metadata`);
    
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
    
    console.log('✅ Media metadata saved');
    return result;
  } catch (error: any) {
    console.error('❌ Failed to save media metadata:', error);
    console.error('❌ Error details:', error.message);
    throw error;
  }
}

