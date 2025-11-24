import { storage } from '../config/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
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
): Promise<string> {
  try {
    console.log('Starting upload:', videoUri);
    
    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    if (!fileInfo.exists) {
      throw new Error('Video file not found');
    }
    
    // Read file as blob
    const response = await fetch(videoUri);
    const blob = await response.blob();
    
    // Create storage path
    const timestamp = Date.now();
    const fileName = `${timestamp}-video.mp4`;
    const storagePath = `media/${locationId}/${jobId}/${fileName}`;
    
    console.log('Uploading to:', storagePath);
    
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
          console.log(`Upload progress: ${progress.progress.toFixed(0)}%`);
        },
        (error) => {
          console.error('Upload error:', error);
          reject(error);
        },
        async () => {
          // Upload complete - get URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log('Upload complete:', downloadURL);
          resolve(downloadURL);
        }
      );
    });
  } catch (error) {
    console.error('Upload failed:', error);
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
    console.error('Failed to delete local video:', error);
  }
}

