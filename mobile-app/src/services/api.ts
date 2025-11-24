import { firestore } from '../config/firebase';
import { collection, getDocs, query, where, doc, getDoc, or } from 'firebase/firestore';
import { Location, Job } from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

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
 * Fetch jobs for a specific location from Firestore with deep debugging
 * Tasks use 'propertyId' field, not 'locationId'
 */
export async function fetchJobsForLocation(locationId: string): Promise<Job[]> {
  try {
    console.log('\n💼 === FETCH JOBS DEBUG ===');
    console.log('💼 Location ID:', locationId);
    
    // First, get the location document to check if it has a propertyId field
    console.log('💼 Step 1: Fetching location document...');
    const locationDoc = await getDoc(doc(firestore, 'locations', locationId));
    
    if (!locationDoc.exists()) {
      console.error('💼 ❌ Location not found:', locationId);
      return [];
    }
    
    const locationData = locationDoc.data();
    console.log('💼 Location data fields:', Object.keys(locationData));
    
    // Determine the propertyId to search for
    // Tasks use 'propertyId', so we need to find what propertyId this location maps to
    // The location's ID might be the propertyId, or there might be a propertyId field
    const propertyId = locationData.propertyId || locationId;
    console.log('💼 Using propertyId for query:', propertyId);
    
    // First, let's try to get ALL tasks (no filter) to see if any exist
    console.log('💼 Step 2: Fetching ALL tasks (no filter)...');
    const allTasksSnap = await getDocs(collection(firestore, 'tasks'));
    console.log('💼 Total tasks in database:', allTasksSnap.size);
    
    if (allTasksSnap.size > 0) {
      console.log('💼 Sample task fields:');
      allTasksSnap.docs.slice(0, 3).forEach(doc => {
        const data = doc.data();
        console.log(`  - ${doc.id}: ${data.title || data.name || 'No title'}`);
        console.log(`    propertyId: ${data.propertyId || 'MISSING'}`);
        console.log(`    locationId: ${data.locationId || 'MISSING'}`);
        console.log(`    All fields:`, Object.keys(data));
      });
    } else {
      console.warn('💼 ⚠️ NO TASKS EXIST IN DATABASE');
      console.warn('💼 You need to create tasks in the web app first!');
      return [];
    }
    
    // Try querying with propertyId first (this is what tasks actually use)
    console.log('💼 Step 3: Querying with propertyId filter...');
    const q = query(
      collection(firestore, 'tasks'),
      where('propertyId', '==', propertyId)
    );
    
    console.log('💼 Executing filtered query...');
    const jobsSnap = await getDocs(q);
    console.log('💼 Filtered results (propertyId):', jobsSnap.size);
    
    // If no results with propertyId, try locationId as fallback (for backward compatibility)
    let finalJobsSnap = jobsSnap;
    if (jobsSnap.size === 0) {
      console.log('💼 Step 4: Trying locationId as fallback...');
      const q2 = query(
        collection(firestore, 'tasks'),
        where('locationId', '==', locationId)
      );
      finalJobsSnap = await getDocs(q2);
      console.log('💼 Filtered results (locationId):', finalJobsSnap.size);
    }
    
    if (finalJobsSnap.size === 0 && allTasksSnap.size > 0) {
      console.warn('💼 ⚠️ Tasks exist but none match this location/property!');
      console.warn('💼 Check if:');
      console.warn('  1. Tasks have the correct propertyId field');
      console.warn('  2. propertyId values match exactly');
      
      // Show what propertyIds actually exist
      console.log('💼 Actual propertyIds in tasks:');
      const propertyIds = new Set<string>();
      allTasksSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.propertyId) {
          propertyIds.add(data.propertyId);
        }
      });
      console.log('💼 Found propertyIds:', Array.from(propertyIds));
      console.log('💼 Looking for:', propertyId);
      console.log('💼 Match?', propertyIds.has(propertyId));
    }
    
    const jobs: Job[] = [];
    
    finalJobsSnap.forEach(doc => {
      const data = doc.data();
      console.log(`💼 Found job: ${data.title || data.name} (${doc.id})`);
      
      jobs.push({
        id: doc.id,
        title: data.title || data.name,
        description: data.description,
        category: data.category,
        locationId: data.locationId || data.propertyId,
        ...data
      } as Job);
    });
    
    console.log('💼 Total jobs returned:', jobs.length);
    console.log('💼 === END DEBUG ===\n');
    
    return jobs;
  } catch (error: any) {
    console.error('❌ === FETCH JOBS ERROR ===');
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ === END ERROR ===');
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

