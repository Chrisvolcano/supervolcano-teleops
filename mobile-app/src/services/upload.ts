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
  try {
    console.log('🚀 Starting upload:', videoUri);
    
    // Get file size by reading the blob
    // For Expo Go compatibility, we'll get size from the blob after fetching
    let fileSize = 0;
    try {
      // Try to get file info first (may fail in Expo Go, that's OK)
      try {
        const fileInfo = await FileSystem.getInfoAsync(videoUri);
        if (fileInfo.exists && fileInfo.size) {
          fileSize = fileInfo.size;
        }
      } catch (fsError) {
        console.log('⚠️ Could not get file info from FileSystem, will get from blob');
      }
    } catch (error) {
      console.log('⚠️ FileSystem check failed, continuing with blob size');
    }
    
    console.log('📦 Initial file size:', fileSize, 'bytes');
    
    // Get video duration - using FileSystem metadata if available
    // expo-av requires a Video component which is complex for this use case
    // For now, we'll set to 0 and let the backend process it if needed
    let durationSeconds = 0;
    console.log('⏱️ Video duration: Will be detected on backend or set to 0');
    
    // Read file as blob
    const response = await fetch(videoUri);
    const blob = await response.blob();
    
    // Get actual file size from blob if we didn't get it from FileSystem
    if (fileSize === 0 && blob.size) {
      fileSize = blob.size;
      console.log('📦 File size from blob:', fileSize, 'bytes');
    }
    
    // Create storage path
    const timestamp = Date.now();
    const fileName = `${timestamp}-video.mp4`;
    const storagePath = `media/${locationId}/${jobId}/${fileName}`;
    
    console.log('📤 Uploading to:', storagePath);
    
    // Create storage reference
    const storageRef = ref(storage, storagePath);
    
    // Start upload
    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: 'video/mp4',
    });
    
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
          console.log(`📊 Upload progress: ${progress.progress.toFixed(0)}%`);
        },
        (error) => {
          console.error('❌ Upload error:', error);
          reject(error);
        },
        async () => {
          // Upload complete - get URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log('✅ Upload complete:', downloadURL);
          resolve({
            storageUrl: downloadURL,
            durationSeconds,
            fileSize,
          });
        }
      );
    });
  } catch (error) {
    console.error('❌ Upload failed:', error);
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

