/**
 * Test function to verify Firebase Storage is working
 * Call this from your app to test basic upload functionality
 */
import { storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function testFirebaseStorage() {
  console.log('═══════════════════════════════════════');
  console.log('🧪 TESTING FIREBASE STORAGE');
  console.log('═══════════════════════════════════════');
  
  try {
    // Step 1: Verify storage is initialized
    console.log('\n📦 Step 1: Checking Storage instance...');
    if (!storage) {
      throw new Error('Storage is not initialized');
    }
    console.log('✅ Storage instance exists');
    console.log('Storage app:', storage.app.name);
    console.log('Storage bucket:', storage.app.options.storageBucket);
    
    // Step 2: Create a simple test file
    console.log('\n📝 Step 2: Creating test blob...');
    const testContent = `Test upload from mobile app at ${new Date().toISOString()}`;
    const blob = new Blob([testContent], { type: 'text/plain' });
    console.log('✅ Blob created');
    console.log('Blob size:', blob.size, 'bytes');
    
    // Step 3: Upload to Storage
    console.log('\n⬆️ Step 3: Uploading to Firebase Storage...');
    const testPath = `test/mobile-app-test-${Date.now()}.txt`;
    console.log('Storage path:', testPath);
    
    const storageRef = ref(storage, testPath);
    console.log('Storage ref created');
    console.log('Full path:', storageRef.fullPath);
    
    console.log('Starting upload...');
    await uploadBytes(storageRef, blob);
    console.log('✅ Upload complete!');
    
    // Step 4: Get download URL
    console.log('\n🔗 Step 4: Getting download URL...');
    const downloadURL = await getDownloadURL(storageRef);
    console.log('✅ Download URL obtained');
    console.log('URL:', downloadURL);
    
    console.log('\n═══════════════════════════════════════');
    console.log('✅ TEST SUCCESSFUL!');
    console.log('═══════════════════════════════════════');
    console.log('Firebase Storage is working correctly');
    console.log('Test file uploaded to:', testPath);
    console.log('Download URL:', downloadURL);
    
    return {
      success: true,
      downloadURL,
      path: testPath,
    };
  } catch (error: any) {
    console.error('\n═══════════════════════════════════════');
    console.error('❌ TEST FAILED');
    console.error('═══════════════════════════════════════');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    console.error('Full error:', JSON.stringify(error, null, 2));
    
    // Provide helpful error messages
    if (error.code === 'storage/unauthorized') {
      console.error('\n💡 SOLUTION: Update Firebase Storage rules');
      console.error('   Go to Firebase Console → Storage → Rules');
      console.error('   Set to: allow read, write: if true;');
    } else if (error.code === 'storage/object-not-found') {
      console.error('\n💡 SOLUTION: Check storage bucket name in config');
    } else if (error.message?.includes('network')) {
      console.error('\n💡 SOLUTION: Check network connection');
    }
    
    throw error;
  }
}

