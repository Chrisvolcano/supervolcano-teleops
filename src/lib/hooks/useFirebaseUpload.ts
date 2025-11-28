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
  ): Promise<string | null> {
    setUploading(true);
    setProgress(0);
    setError(null);
    
    try {
      console.log(`Starting upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) to ${path}`);
      
      // Create storage reference
      const storageRef = ref(storage, path);
      
      // Start upload with resumable upload (handles large files)
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
      });
      
      return new Promise((resolve, reject) => {
        // Monitor upload progress
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setProgress(Math.round(percent));
            console.log(`Upload progress: ${Math.round(percent)}%`);
          },
          (error) => {
            console.error('Upload error:', error);
            let errorMessage = error.message;
            
            // Provide helpful error messages
            if (error.code === 'storage/unauthorized') {
              errorMessage = 'Permission denied. Please check Firebase Storage rules.';
            } else if (error.code === 'storage/canceled') {
              errorMessage = 'Upload canceled.';
            } else if (error.code === 'storage/quota-exceeded') {
              errorMessage = 'Storage quota exceeded.';
            }
            
            setError(errorMessage);
            setUploading(false);
            reject(error);
          },
          async () => {
            // Upload completed - get download URL
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('Upload complete! URL:', downloadURL);
              
              setUploading(false);
              setProgress(100);
              
              if (onComplete) {
                onComplete(downloadURL);
              }
              
              resolve(downloadURL);
            } catch (error: any) {
              console.error('Failed to get download URL:', error);
              setError('Upload completed but failed to get URL');
              setUploading(false);
              reject(error);
            }
          }
        );
      });
    } catch (error: any) {
      console.error('Upload setup failed:', error);
      setError(error.message);
      setUploading(false);
      return null;
    }
  }
  
  return {
    uploadFile,
    uploading,
    progress,
    error,
  };
}

