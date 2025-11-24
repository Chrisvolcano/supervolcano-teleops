'use client'

import { useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/firebaseClient';

export function useFirebaseUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  async function uploadFile(
    file: File,
    path: string,
    onComplete?: (url: string) => void
  ) {
    setUploading(true);
    setProgress(0);
    setError(null);
    
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
        },
        async () => {
          // Upload completed - get download URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setUploading(false);
          setProgress(100);
          
          if (onComplete) {
            onComplete(downloadURL);
          }
        }
      );
      
      return uploadTask;
    } catch (error: any) {
      console.error('Upload failed:', error);
      setError(error.message);
      setUploading(false);
      throw error;
    }
  }
  
  return {
    uploadFile,
    uploading,
    progress,
    error,
  };
}

