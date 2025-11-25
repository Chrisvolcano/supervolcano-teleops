import { firestore } from '../config/firebase';
import { collection, getDocs, query, where, doc, getDoc, or } from 'firebase/firestore';
import { Location, Job } from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

/**
 * Fetch assigned location IDs for a user
 * Used to filter locations in mobile app
 */
export async function fetchAssignedLocationIds(userId: string): Promise<string[]> {
  try {
    console.log(`📍 Fetching assigned locations for user: ${userId}`);
    
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}/assigned-locations`);
    const data = await response.json();
    
    if (!data.success) {
      console.warn('⚠️ Failed to fetch assigned locations:', data.error);
      return []; // Return empty array if API fails - will show all locations
    }
    
    console.log(`📍 User assigned to ${data.count} locations:`, data.locationIds);
    return data.locationIds || [];
    
  } catch (error: any) {
    console.error('❌ Failed to fetch assigned locations:', error);
    return []; // Return empty array on error - will show all locations
  }
}

/**
 * Fetch all locations from Firestore with deep debugging
 */
export async function fetchLocations(): Promise<Location[]> {
  try {
    console.log('📍 === FETCH LOCATIONS DEBUG ===');
    console.log('📍 Firestore instance:', firestore ? 'EXISTS' : 'MISSING');
    console.log('📍 Firestore app:', firestore?.app?.name);
    
    // Test 1: Try to list all collections (root level)
    console.log('📍 Test 1: Attempting to query locations collection...');
    
    const locationsRef = collection(firestore, 'locations');
    console.log('📍 Collection reference created:', locationsRef.path);
    console.log('📍 Collection ID:', locationsRef.id);
    console.log('📍 Collection parent:', locationsRef.parent?.path);
    
    console.log('📍 Executing getDocs...');
    const locationsSnap = await getDocs(locationsRef);
    console.log('📍 Query completed. Snapshot received.');
    console.log('📍 Snapshot size:', locationsSnap.size);
    console.log('📍 Snapshot empty:', locationsSnap.empty);
    console.log('📍 Snapshot metadata:', JSON.stringify(locationsSnap.metadata));
    
    if (locationsSnap.empty) {
      console.warn('⚠️ Query returned empty! But 7 docs exist in console.');
      console.warn('⚠️ Possible causes:');
      console.warn('  1. Firestore rules blocking read');
      console.warn('  2. Wrong database instance');
      console.warn('  3. Collection name mismatch');
      console.warn('  4. Network/cache issue');
      
      // Test 2: Try to get a specific document if we know an ID
      console.log('📍 Test 2: Attempting direct document read...');
      console.log('📍 (Skipping - need document ID)');
    }
    
    const locations: Location[] = [];
    
    locationsSnap.forEach((docSnap) => {
      console.log('📍 Processing document:', docSnap.id);
      const data = docSnap.data();
      console.log('📍 Document data keys:', Object.keys(data));
      console.log('📍 Document name:', data.name);
      
      locations.push({
        id: docSnap.id,
        ...data
      } as Location);
    });
    
    console.log('📍 Total locations processed:', locations.length);
    console.log('📍 === END DEBUG ===');
    
    return locations;
  } catch (error: any) {
    console.error('❌ === FETCH LOCATIONS ERROR ===');
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error('❌ === END ERROR ===');
    throw error;
  }
}

/**
 * Test function to fetch a specific location by ID
 */
export async function testFetchSpecificLocation(locationId: string) {
  try {
    console.log(`🧪 Testing fetch for location: ${locationId}`);
    
    const docRef = doc(firestore, 'locations', locationId);
    console.log('🧪 Document reference:', docRef.path);
    
    const docSnap = await getDoc(docRef);
    console.log('🧪 Document exists:', docSnap.exists());
    
    if (docSnap.exists()) {
      console.log('🧪 Document data:', docSnap.data());
      return docSnap.data();
    } else {
      console.log('🧪 Document does NOT exist');
      return null;
    }
  } catch (error: any) {
    console.error('🧪 Test failed:', error);
    console.error('🧪 Error code:', error.code);
    console.error('🧪 Error message:', error.message);
    throw error;
  }
}

/**
 * Fetch locations using REST API (fallback method)
 */
export async function fetchLocationsViaREST(): Promise<Location[]> {
  try {
    const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    const databaseId = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_ID || 'default';
    
    // Use 'default' not '(default)'!
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/locations?key=${apiKey}`;
    
    console.log('🌐 Fetching via REST API...');
    console.log('🌐 Database ID:', databaseId);
    console.log('🌐 URL:', url);
    
    const response = await fetch(url);
    console.log('🌐 REST API response status:', response.status);
    
    const data = await response.json();
    console.log('🌐 REST API response:', JSON.stringify(data, null, 2));
    
    if (response.status !== 200) {
      console.error('🌐 REST API error:', data);
      return [];
    }
    
    if (data.documents) {
      console.log('🌐 Found documents:', data.documents.length);
      
      const locations = data.documents.map((doc: any) => {
        const id = doc.name.split('/').pop();
        const fields = doc.fields;
        
        return {
          id,
          name: fields.name?.stringValue || '',
          address: fields.address?.stringValue || '',
          assignedOrganizationName: fields.assignedOrganizationName?.stringValue || '',
          assignedOrganizationId: fields.assignedOrganizationId?.stringValue || '',
        } as Location;
      });
      
      console.log('🌐 Parsed locations:', locations.length);
      return locations;
    }
    
    console.warn('🌐 No documents in response');
    return [];
  } catch (error: any) {
    console.error('🌐 REST API failed:', error);
    throw error;
  }
}

/**
 * Fetch jobs for a specific location from Firestore
 * Uses locationId field (consistent terminology)
 */
export async function fetchJobsForLocation(locationId: string): Promise<Job[]> {
  try {
    console.log('\n💼 === FETCH JOBS DEBUG ===');
    console.log('💼 Location ID:', locationId);
    
    // Query using locationId (new consistent field name)
    // Support both locationId and propertyId during migration transition
    const q = query(
      collection(firestore, 'tasks'),
      where('locationId', '==', locationId)
    );
    
    console.log('💼 Executing query with locationId field...');
    const jobsSnap = await getDocs(q);
    console.log('💼 Found', jobsSnap.size, 'jobs');
    
    // If no results with locationId, try propertyId as fallback (during migration)
    let finalJobsSnap = jobsSnap;
    if (jobsSnap.size === 0) {
      console.log('💼 Trying propertyId as fallback (migration transition)...');
      const q2 = query(
        collection(firestore, 'tasks'),
        where('propertyId', '==', locationId)
      );
      finalJobsSnap = await getDocs(q2);
      console.log('💼 Found', finalJobsSnap.size, 'jobs (using propertyId fallback)');
    }
    
    const jobs: Job[] = [];
    
    finalJobsSnap.forEach(doc => {
      const data = doc.data();
      console.log(`💼 Job: ${data.title || data.name} (${doc.id})`);
      
      jobs.push({
        id: doc.id,
        title: data.title || data.name,
        description: data.description,
        category: data.category,
        locationId: data.locationId || data.propertyId, // Use locationId, fallback to propertyId during migration
        locationName: data.locationName,
        ...data
      } as Job);
    });
    
    console.log('💼 Total jobs returned:', jobs.length);
    console.log('💼 === END DEBUG ===\n');
    
    return jobs;
  } catch (error: any) {
    console.error('❌ Failed to fetch jobs:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    throw error;
  }
}

/**
 * Save media metadata via teleoperator API (no auth required)
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
    console.log('💾 API URL:', `${API_BASE_URL}/api/teleoperator/media/metadata`);
    console.log('💾 Data:', {
      taskId: data.taskId,
      locationId: data.locationId,
      fileName: data.fileName,
      fileSize: data.fileSize,
      durationSeconds: data.durationSeconds,
    });
    
    const response = await fetch(`${API_BASE_URL}/api/teleoperator/media/metadata`, {
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
    
    const responseText = await response.text();
    console.log('💾 Response status:', response.status);
    console.log('💾 Response ok:', response.ok);
    console.log('💾 Response text:', responseText);
    
    if (!response.ok) {
      console.error('❌ API returned error status:', response.status);
      throw new Error(`API error ${response.status}: ${responseText}`);
    }
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse JSON response');
      throw new Error(`Invalid JSON response: ${responseText}`);
    }
    
    if (!result.success) {
      console.error('❌ API returned success: false');
      console.error('❌ Error from API:', result.error);
      throw new Error(result.error || 'Failed to save metadata');
    }
    
    console.log('✅ Media metadata saved successfully');
    console.log('✅ Media ID:', result.id);
    console.log('✅ Storage URL:', result.url?.substring(0, 100));
    return result;
  } catch (error: any) {
    console.error('═══════════════════════════════════════');
    console.error('❌ SAVE METADATA FAILED');
    console.error('═══════════════════════════════════════');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

