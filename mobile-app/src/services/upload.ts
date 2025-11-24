import { storage } from '../config/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { FileSystem } from 'expo-file-system';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
}

/**
 * Get video duration and file size
 */
export async function getVideoMetadata(videoUri: string): Promise<{ durationSeconds: number; fileSize: number }> {
  try {
    console.log('📹 Getting video metadata for:', videoUri);
    
    // Get file size - try FileSystem first, fallback to blob
    let fileSize = 0;
    try {
      const fileInfo = await FileSystem.getInfoAsync(videoUri);
      if (fileInfo.exists && fileInfo.size) {
        fileSize = fileInfo.size;
      }
    } catch (error) {
      // If FileSystem fails, we'll get size from blob later
      console.log('⚠️ Could not get file size from FileSystem');
    }
    console.log('📹 File size:', fileSize, 'bytes');
    
    // Get video duration - expo-av doesn't have a simple API for this
    // We'll use a workaround with a temporary Video component or skip it
    // For now, we'll skip duration detection and set to 0
    // TODO: Implement proper duration detection if needed
    let durationSeconds = 0;
    console.log('📹 Video duration: Not detected (will be 0)');
    
    return { durationSeconds, fileSize };
  } catch (error) {
    console.error('❌ Failed to get video metadata:', error);
    return { durationSeconds: 0, fileSize: 0 };
  }
}

/**
 * Upload video directly to Firebase Storage
 * Does NOT save to camera roll
 */
export async function uploadVideoToFirebase(
  videoUri: string,
  locationId: string,
  jobId: string,
  onProgress: (progress: UploadProgress) => void
): Promise<{ storageUrl: string; durationSeconds: number; fileSize: number }> {
  console.log('═══════════════════════════════════════');
  console.log('📹 UPLOAD START');
  console.log('═══════════════════════════════════════');
  console.log('Video URI:', videoUri);
  console.log('Location ID:', locationId);
  console.log('Job ID:', jobId);
  
  try {
    // Step 1: Read video file
    console.log('\n📦 Step 1: Reading video file...');
    console.log('Fetching from URI:', videoUri);
    
    const response = await fetch(videoUri);
    console.log('Fetch response status:', response.status);
    console.log('Fetch response ok:', response.ok);
    
    if (!response.ok) {
      throw new Error(`Failed to read video file: ${response.status}`);
    }
    
    const blob = await response.blob();
    console.log('✅ Blob created');
    console.log('Blob size:', blob.size, 'bytes');
    console.log('Blob type:', blob.type);
    
    if (blob.size === 0) {
      throw new Error('Video file is empty (0 bytes)');
    }
    
    const fileSize = blob.size;
    let durationSeconds = 0;
    
    // Step 2: Create storage reference
    console.log('\n☁️ Step 2: Creating storage reference...');
    const timestamp = Date.now();
    const fileName = `${timestamp}-video.mp4`;
    const storagePath = `media/${locationId}/${jobId}/${fileName}`;
    console.log('Storage path:', storagePath);
    
    // Verify storage is initialized
    if (!storage) {
      throw new Error('Firebase Storage is not initialized');
    }
    console.log('Storage instance:', storage ? 'EXISTS' : 'MISSING');
    console.log('Storage app:', storage.app.name);
    
    const storageRef = ref(storage, storagePath);
    console.log('Storage ref created');
    console.log('Storage ref fullPath:', storageRef.fullPath);
    console.log('Storage ref bucket:', storageRef.bucket);
    
    // Step 3: Upload to Firebase Storage
    console.log('\n⬆️ Step 3: Uploading to Firebase Storage...');
    console.log('Starting uploadBytesResumable...');
    
    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: 'video/mp4',
    });
    
    console.log('Upload task created');
    
    // Monitor upload progress
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = {
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
          };
          onProgress(progress);
          console.log(`📊 Upload progress: ${progress.progress.toFixed(1)}%`);
          console.log(`   Bytes: ${snapshot.bytesTransferred} / ${snapshot.totalBytes}`);
          console.log(`   State: ${snapshot.state}`);
        },
        (error) => {
          console.error('═══════════════════════════════════════');
          console.error('❌ UPLOAD ERROR');
          console.error('═══════════════════════════════════════');
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          console.error('Error name:', error.name);
          console.error('Error serverResponse:', error.serverResponse);
          console.error('Full error:', JSON.stringify(error, null, 2));
          reject(error);
        },
        async () => {
          console.log('✅ Upload to Storage complete!');
          
          try {
            // Step 4: Get download URL
            console.log('\n🔗 Step 4: Getting download URL...');
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('✅ Download URL obtained');
            console.log('URL (first 100 chars):', downloadURL.substring(0, 100) + '...');
            
            console.log('═══════════════════════════════════════');
            console.log('✅ UPLOAD COMPLETE SUCCESS');
            console.log('═══════════════════════════════════════');
            console.log('Storage URL:', downloadURL);
            console.log('File size:', fileSize, 'bytes');
            console.log('Duration:', durationSeconds, 'seconds');
            
            resolve({
              storageUrl: downloadURL,
              durationSeconds,
              fileSize,
            });
          } catch (error) {
            console.error('❌ Error getting download URL:', error);
            reject(error);
          }
        }
      );
    });
  } catch (error: any) {
    console.error('═══════════════════════════════════════');
    console.error('❌ UPLOAD FAILED');
    console.error('═══════════════════════════════════════');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

/**
 * Delete temporary video file
 */
export async function deleteLocalVideo(videoUri: string) {
  try {
    await FileSystem.deleteAsync(videoUri, { idempotent: true });
    console.log('Deleted local video:', videoUri);
  } catch (error) {
    // Silently fail - file might already be deleted or not accessible
    console.log('Note: Could not delete local video (may already be deleted)');
  }
}

