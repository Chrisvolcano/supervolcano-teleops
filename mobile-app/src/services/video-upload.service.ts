/**
 * VIDEO UPLOAD SERVICE - Mobile App
 * Handles video upload to Firebase Storage with metadata
 */

import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '@/config/firebase';
import type { VideoUpload } from '@/types/user.types';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number; // 0-100
}

export class VideoUploadService {
  /**
   * Upload video to Firebase Storage
   * Path: videos/{locationId}/{userId}/{timestamp}.mp4
   */
  static async uploadVideo(
    videoUri: string,
    locationId: string,
    userId: string,
    organizationId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<VideoUpload> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${timestamp}.mp4`;
      const storagePath = `videos/${locationId}/${userId}/${filename}`;

      // Create Firestore record first (status: uploading)
      const videoDoc = await addDoc(collection(db, 'videos'), {
        userId,
        locationId,
        organizationId,
        status: 'uploading',
        uploadedAt: new Date(),
        storagePath,
      });

      // Fetch video file as blob
      const response = await fetch(videoUri);
      const blob = await response.blob();

      // Upload to Firebase Storage
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, blob, {
        contentType: 'video/mp4',
      });

      // Monitor upload progress
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = {
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              progress: Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            };
            onProgress?.(progress);
          },
          (error) => {
            // Upload failed - update Firestore
            updateDoc(doc(db, 'videos', videoDoc.id), {
              status: 'failed',
              error: error.message,
            });
            reject(new Error('Upload failed. Please check your connection and try again.'));
          },
          async () => {
            // Upload successful - get download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Get video metadata
            const fileSize = blob.size;

            // Update Firestore with completed status
            await updateDoc(doc(db, 'videos', videoDoc.id), {
              status: 'completed',
              videoUrl: downloadURL,
              fileSize,
            });

            const videoUpload: VideoUpload = {
              id: videoDoc.id,
              userId,
              locationId,
              organizationId,
              videoUrl: downloadURL,
              fileSize,
              uploadedAt: new Date(),
              status: 'completed',
            };

            resolve(videoUpload);
          }
        );
      });
    } catch (error: any) {
      console.error('[VideoUploadService] Upload error:', error);
      throw new Error('Failed to upload video. Please try again.');
    }
  }
}

