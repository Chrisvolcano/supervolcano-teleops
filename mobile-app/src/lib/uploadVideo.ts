/**
 * SIMPLIFIED VIDEO UPLOAD UTILITY
 * Upload videos to Firebase Storage and save metadata to Firestore
 * Last updated: 2025-11-26
 */

import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, firestore } from '../config/firebase';

interface UploadMetadata {
  userId?: string;
  userName?: string;
  locationId?: string; // CRITICAL - for filtering videos by location
  timestamp?: string;
}

export async function uploadVideo(
  videoUri: string,
  metadata: UploadMetadata = {}
): Promise<string> {
  try {
    console.log('📹 Starting video upload...');
    
    // Generate unique filename
    const timestamp = Date.now();
    const userId = metadata.userId || 'unknown';
    const locationId = metadata.locationId || 'unassigned';
    const filename = `videos/${locationId}/${userId}/${timestamp}.mp4`;
    const storageRef = ref(storage, filename);

    console.log('📹 Storage path:', filename);

    // Read video file
    const response = await fetch(videoUri);
    const blob = await response.blob();
    
    console.log('📹 Blob size:', blob.size, 'bytes');

    // Upload to Firebase Storage
    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: 'video/mp4',
      customMetadata: {
        uploadedBy: userId,
        uploadedByName: metadata.userName || 'Unknown',
        uploadedAt: metadata.timestamp || new Date().toISOString(),
      },
    });

    // Wait for upload to complete
    await new Promise<void>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`📊 Upload progress: ${progress.toFixed(1)}%`);
        },
        (error) => {
          console.error('❌ Upload error:', error);
          reject(error);
        },
        () => {
          console.log('✅ Upload complete');
          resolve();
        }
      );
    });

    // Get download URL
    const downloadUrl = await getDownloadURL(storageRef);
    console.log('✅ Download URL obtained');

    // Save metadata to Firestore
    await addDoc(collection(firestore, 'videos'), {
      url: downloadUrl,
      storagePath: filename,
      location_id: locationId, // CRITICAL - for filtering videos by location
      uploadedBy: userId,
      uploadedByName: metadata.userName || 'Unknown',
      uploadedAt: serverTimestamp(),
      status: 'unassigned', // Admin can assign to task later
      createdAt: serverTimestamp(),
    });

    console.log('✅ Video metadata saved to Firestore');
    return downloadUrl;

  } catch (error) {
    console.error('❌ Upload error:', error);
    throw new Error('Failed to upload video');
  }
}

