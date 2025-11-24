'use client'

import { useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, firebaseAuth } from '@/lib/firebaseClient'; // Use main Firebase client that shares auth

export function useFirebaseUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  async function uploadFile(
    file: File,
    path: string,
    onComplete?: (url: string) => void
  ): Promise<string> {
    // Ensure user is authenticated before uploading
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) {
      const errorMsg = 'You must be logged in to upload files';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
    
    // Wait for auth token to be ready
    try {
      await currentUser.getIdToken(true); // Force refresh to ensure token is valid
    } catch (authError) {
      const errorMsg = 'Authentication failed. Please log in again.';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
    
    setUploading(true);
    setProgress(0);
    setError(null);
    
    return new Promise((resolve, reject) => {
      try {
        // Create storage reference
        const storageRef = ref(storage, path);
        
        // Start upload with resumable upload (handles large files)
        const uploadTask = uploadBytesResumable(storageRef, file, {
          contentType: file.type,
        });
        
        // Monitor upload progress
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setProgress(Math.round(percent));
          },
          (error) => {
            console.error('Upload error:', error);
            setError(error.message);
            setUploading(false);
            reject(error);
          },
          async () => {
            try {
              // Upload completed - get download URL
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              setUploading(false);
              setProgress(100);
              
              if (onComplete) {
                onComplete(downloadURL);
              }
              resolve(downloadURL);
            } catch (error: any) {
              setError(error.message);
              setUploading(false);
              reject(error);
            }
          }
        );
      } catch (error: any) {
        console.error('Upload failed:', error);
        setError(error.message);
        setUploading(false);
        reject(error);
      }
    });
  }
  
  return {
    uploadFile,
    uploading,
    progress,
    error,
  };
}

