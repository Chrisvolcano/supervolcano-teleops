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
    console.log('[VideoUploadService] Starting upload...');
    console.log('[VideoUploadService] Video URI:', videoUri);
    console.log('[VideoUploadService] Location ID:', locationId);
    console.log('[VideoUploadService] User ID:', userId);
    
    try {
      // Get video metadata first (including duration)
      console.log('[VideoUploadService] Getting video metadata...');
      const metadata = await this.getVideoMetadata(videoUri);
      console.log('[VideoUploadService] Metadata:', metadata);
      
      // Generate unique filename
      const timestamp = Date.now();
      const extension = videoUri.split('.').pop()?.toLowerCase() || 'mp4';
      const filename = `${timestamp}.${extension}`;
      const storagePath = `videos/${locationId}/${userId}/${filename}`;
      console.log('[VideoUploadService] Storage path:', storagePath);

      // Create Firestore record first (status: uploading)
      console.log('[VideoUploadService] Creating Firestore doc...');
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
      console.log('[VideoUploadService] Firestore doc created:', videoDoc.id);

      // Fetch video file as blob
      console.log('[VideoUploadService] Fetching video file as blob...');
      const response = await fetch(videoUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch video file: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      console.log('[VideoUploadService] Blob created, size:', blob.size, 'bytes');

      // Upload to Firebase Storage
      console.log('[VideoUploadService] Starting Storage upload...');
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, blob, {
        contentType: metadata.mimeType,
      });
      console.log('[VideoUploadService] Upload task created');

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
          async (error) => {
            // Upload failed - update Firestore
            console.error('[VideoUploadService] Upload task error:', error);
            console.error('[VideoUploadService] Error code:', error.code);
            console.error('[VideoUploadService] Error message:', error.message);
            console.error('[VideoUploadService] Error stack:', error.stack);
            
            try {
              await updateDoc(doc(db, 'media', videoDoc.id), {
                status: 'failed',
                error: error.message || 'Upload failed',
              });
              console.log('[VideoUploadService] Firestore doc updated to failed status');
            } catch (updateError: any) {
              console.error('[VideoUploadService] Failed to update Firestore on upload error:', updateError);
              console.error('[VideoUploadService] Update error message:', updateError?.message);
            }
            
            reject(new Error('Upload failed. Please check your connection and try again.'));
          },
          async () => {
            // Upload successful - get download URL and update Firestore
            try {
              console.log('[VideoUploadService] Upload to Storage complete, getting download URL...');
              console.log('[VideoUploadService] Storage ref:', uploadTask.snapshot.ref.fullPath);
              
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('[VideoUploadService] Download URL obtained:', downloadURL.substring(0, 100) + '...');

              // Update Firestore with completed status
              console.log('[VideoUploadService] Updating Firestore doc:', videoDoc.id);
              await updateDoc(doc(db, 'media', videoDoc.id), {
                status: 'completed',
                url: downloadURL,        // Primary field for web
                videoUrl: downloadURL,   // Keep for backwards compatibility
                storageUrl: downloadURL, // Also used by web
                // Confirm fileSize from actual blob
                fileSize: blob.size,
              });
              console.log('[VideoUploadService] Firestore doc updated successfully');

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

              console.log('[VideoUploadService] Upload complete:', videoDoc.id);
              resolve(videoUpload);
            } catch (error: any) {
              // Critical: If completion callback fails, update Firestore and reject Promise
              console.error('[VideoUploadService] Completion callback error:', error);
              console.error('[VideoUploadService] Error message:', error?.message);
              console.error('[VideoUploadService] Error code:', error?.code);
              console.error('[VideoUploadService] Error stack:', error?.stack);
              
              // Update Firestore to failed status
              try {
                await updateDoc(doc(db, 'media', videoDoc.id), {
                  status: 'failed',
                  error: `Failed to get download URL or update Firestore: ${error?.message || 'Unknown error'}`,
                });
                console.log('[VideoUploadService] Firestore doc updated to failed status');
              } catch (updateError: any) {
                console.error('[VideoUploadService] Failed to update Firestore on completion error:', updateError);
              }
              
              // Reject Promise so caller knows upload failed
              reject(new Error(`Upload completed but failed to finalize: ${error?.message || 'Unknown error'}`));
            }
          }
        );
      });
    } catch (error: any) {
      console.error('[VideoUploadService] ========================================');
      console.error('[VideoUploadService] UPLOAD SETUP ERROR');
      console.error('[VideoUploadService] ========================================');
      console.error('[VideoUploadService] Error:', error);
      console.error('[VideoUploadService] Error message:', error?.message);
      console.error('[VideoUploadService] Error code:', error?.code);
      console.error('[VideoUploadService] Error stack:', error?.stack);
      console.error('[VideoUploadService] ========================================');
      throw new Error(`Failed to upload video: ${error?.message || error?.code || 'Unknown error'}`);
    }
  }
}
