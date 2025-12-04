/**
 * VIDEO UPLOAD SERVICE - Mobile App
 * Handles video upload to Firebase Storage with metadata including duration
 */

import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '@/config/firebase';
import { Audio, Video } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import type { VideoUpload } from '@/types/user.types';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number; // 0-100
}

export interface VideoMetadata {
  durationSeconds: number;
  width?: number;
  height?: number;
  fileSize: number;
  mimeType: string;
}

export class VideoUploadService {
  /**
   * Get video metadata including duration
   */
  static async getVideoMetadata(videoUri: string): Promise<VideoMetadata> {
    try {
      // Get file info for size
      const fileInfo = await FileSystem.getInfoAsync(videoUri, { size: true });
      const fileSize = (fileInfo as any).size || 0;

      // Determine mime type from extension
      const extension = videoUri.split('.').pop()?.toLowerCase() || 'mp4';
      const mimeType = extension === 'mov' ? 'video/quicktime' : 'video/mp4';

      // Get duration using expo-av
      let durationSeconds = 0;
      try {
        const { sound, status } = await Audio.Sound.createAsync(
          { uri: videoUri },
          { shouldPlay: false }
        );
        
        if (status.isLoaded && status.durationMillis) {
          durationSeconds = Math.round(status.durationMillis / 1000);
        }
        
        // Unload to free resources
        await sound.unloadAsync();
      } catch (audioError) {
        console.warn('[VideoUploadService] Could not get duration via Audio, trying Video:', audioError);
        
        // Fallback: try using Video component approach
        // This is a backup - duration will be 0 if both fail
      }

      console.log('[VideoUploadService] Metadata:', { durationSeconds, fileSize, mimeType });

      return {
        durationSeconds,
        fileSize,
        mimeType,
      };
    } catch (error) {
      console.error('[VideoUploadService] Failed to get metadata:', error);
      return {
        durationSeconds: 0,
        fileSize: 0,
        mimeType: 'video/mp4',
      };
    }
  }

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
      // Get video metadata first (including duration)
      const metadata = await this.getVideoMetadata(videoUri);
      
      // Generate unique filename
      const timestamp = Date.now();
      const extension = videoUri.split('.').pop()?.toLowerCase() || 'mp4';
      const filename = `${timestamp}.${extension}`;
      const storagePath = `videos/${locationId}/${userId}/${filename}`;

      // Create Firestore record first (status: uploading)
      const videoDoc = await addDoc(collection(db, 'media'), {
        userId,
        locationId,
        organizationId,
        status: 'uploading',
        uploadedAt: new Date(),
        storagePath,
        // Core type fields - include both for compatibility
        type: 'video',
        mediaType: 'video',
        mimeType: metadata.mimeType,
        fileName: filename,
        durationSeconds: metadata.durationSeconds,
        fileSize: metadata.fileSize,
        // AI processing fields
        aiStatus: 'pending',
        trainingStatus: 'pending',
      });

      // Fetch video file as blob
      const response = await fetch(videoUri);
      const blob = await response.blob();

      // Upload to Firebase Storage
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, blob, {
        contentType: metadata.mimeType,
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
            updateDoc(doc(db, 'media', videoDoc.id), {
              status: 'failed',
              error: error.message,
            });
            reject(new Error('Upload failed. Please check your connection and try again.'));
          },
          async () => {
            // Upload successful - get download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            // Update Firestore with completed status
            await updateDoc(doc(db, 'media', videoDoc.id), {
              status: 'completed',
              url: downloadURL,        // Primary field for web
              videoUrl: downloadURL,   // Keep for backwards compatibility
              storageUrl: downloadURL, // Also used by web
              // Confirm fileSize from actual blob
              fileSize: blob.size,
            });

            const videoUpload: VideoUpload = {
              id: videoDoc.id,
              userId,
              locationId,
              organizationId,
              videoUrl: downloadURL,
              fileSize: blob.size,
              uploadedAt: new Date(),
              status: 'completed',
            };

            resolve(videoUpload);
          }
        );
      });
    } catch (error: any) {
      console.error('[VideoUploadService] Upload error:', error);
      console.error('[VideoUploadService] Error message:', error?.message);
      console.error('[VideoUploadService] Error code:', error?.code);
      throw new Error(`Failed to upload video: ${error?.message || error?.code || 'Unknown error'}`);
    }
  }
}
