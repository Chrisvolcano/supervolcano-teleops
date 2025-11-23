"use client";

/**
 * Media Uploader Component
 * Handles drag-and-drop and file selection for uploading images and videos to Firebase Storage
 */

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { storage } from "@/lib/firebaseClient";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { X, Image as ImageIcon, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  locationId: string;
  instructionId: string;
  onUploadComplete: (imageUrls: string[], videoUrls: string[]) => void;
  onUploadError?: (error: Error) => void;
  existingImageUrls?: string[];
  existingVideoUrls?: string[];
  onRemoveExisting?: (url: string, type: "image" | "video") => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  allowVideos?: boolean;
}

interface UploadProgress {
  file: File;
  progress: number;
  url?: string;
  error?: string;
  type: "image" | "video";
}

export function ImageUploader({
  locationId,
  instructionId,
  onUploadComplete,
  onUploadError,
  existingImageUrls = [],
  existingVideoUrls = [],
  onRemoveExisting,
  maxFiles = 10,
  maxSizeMB = 5,
  accept,
  allowVideos = true,
}: ImageUploaderProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default accept string based on allowVideos
  const defaultAccept = allowVideos
    ? "image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/quicktime,video/webm,video/x-msvideo"
    : "image/jpeg,image/jpg,image/png,image/webp";
  const acceptString = accept || defaultAccept;

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    const isImage = file.type.match(/^image\/(jpeg|jpg|png|webp)$/);
    const isVideo = allowVideos && file.type.match(/^video\/(mp4|quicktime|webm|x-msvideo)$/);

    if (!isImage && !isVideo) {
      const allowedTypes = allowVideos
        ? "JPG, PNG, WebP images or MP4, MOV, WebM, AVI videos"
        : "JPG, PNG, and WebP images";
      return `Invalid file type. Only ${allowedTypes} are allowed.`;
    }

    // Check file size (videos can be larger)
    const sizeMB = file.size / (1024 * 1024);
    const videoMaxSize = maxSizeMB * 10; // Videos can be 10x larger
    const fileMaxSize = isVideo ? videoMaxSize : maxSizeMB;
    
    if (sizeMB > fileMaxSize) {
      return `File size exceeds ${fileMaxSize}MB limit.`;
    }

    return null;
  }, [allowVideos, maxSizeMB]);

  const uploadFile = useCallback(
    async (file: File): Promise<string> => {
      const validationError = validateFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filename = `${timestamp}-${sanitizedFilename}`;
      const storagePath = `locations/${locationId}/instructions/${instructionId}/${filename}`;
      const storageRef = ref(storage, storagePath);

      return new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploads((prev) =>
              prev.map((u) =>
                u.file === file ? { ...u, progress: Math.round(progress) } : u,
              ),
            );
          },
          (error) => {
            console.error("[ImageUploader] Upload error:", error);
            setUploads((prev) =>
              prev.map((u) =>
                u.file === file ? { ...u, error: error.message } : u,
              ),
            );
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              setUploads((prev) =>
                prev.map((u) =>
                  u.file === file ? { ...u, url: downloadURL, progress: 100 } : u,
                ),
              );
              resolve(downloadURL);
            } catch (error: any) {
              console.error("[ImageUploader] Failed to get download URL:", error);
              setUploads((prev) =>
                prev.map((u) =>
                  u.file === file ? { ...u, error: "Failed to get download URL" } : u,
                ),
              );
              reject(error);
            }
          },
        );
      });
    },
    [locationId, instructionId, validateFile],
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      const validFiles: File[] = [];
      const errors: string[] = [];

      // Validate all files first
      fileArray.forEach((file) => {
        const error = validateFile(file);
        if (error) {
          errors.push(`${file.name}: ${error}`);
        } else {
          validFiles.push(file);
        }
      });

      if (errors.length > 0) {
        onUploadError?.(new Error(errors.join("\n")));
      }

      if (validFiles.length === 0) return;

      // Check total file count
      const totalFiles = existingImageUrls.length + existingVideoUrls.length + uploads.length + validFiles.length;
      if (totalFiles > maxFiles) {
        onUploadError?.(
          new Error(`Maximum ${maxFiles} files allowed. Please remove some files first.`),
        );
        return;
      }

      // Add files to upload queue with type
      const newUploads: UploadProgress[] = validFiles.map((file) => ({
        file,
        progress: 0,
        type: getFileType(file),
      }));
      setUploads((prev) => [...prev, ...newUploads]);

      // Upload all files
      try {
        const uploadedItems = await Promise.all(
          validFiles.map(async (file) => {
            const url = await uploadFile(file);
            return { url, type: getFileType(file) };
          })
        );
        
        // Separate images and videos
        const newImageUrls = uploadedItems.filter(item => item.type === "image").map(item => item.url);
        const newVideoUrls = uploadedItems.filter(item => item.type === "video").map(item => item.url);
        
        // Combine with existing
        const allImageUrls = [...existingImageUrls, ...newImageUrls];
        const allVideoUrls = [...existingVideoUrls, ...newVideoUrls];
        
        onUploadComplete(allImageUrls, allVideoUrls);
      } catch (error: any) {
        console.error("[ImageUploader] Upload failed:", error);
        onUploadError?.(error);
      }
    },
    [existingImageUrls, existingVideoUrls, uploads.length, maxFiles, uploadFile, onUploadComplete, onUploadError, validateFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleFiles],
  );

  const removeUpload = useCallback(
    (file: File) => {
      setUploads((prev) => {
        const filtered = prev.filter((u) => u.file !== file);
        const completedItems = filtered
          .filter((u) => u.url)
          .map((u) => ({ url: u.url!, type: u.type }));
        
        const completedImageUrls = completedItems.filter(item => item.type === "image").map(item => item.url);
        const completedVideoUrls = completedItems.filter(item => item.type === "video").map(item => item.url);
        
        const allImageUrls = [...existingImageUrls, ...completedImageUrls];
        const allVideoUrls = [...existingVideoUrls, ...completedVideoUrls];
        
        onUploadComplete(allImageUrls, allVideoUrls);
        return filtered;
      });
    },
    [existingImageUrls, existingVideoUrls, onUploadComplete],
  );

  const removeExisting = useCallback(
    (url: string, type: "image" | "video") => {
      onRemoveExisting?.(url, type);
    },
    [onRemoveExisting],
  );

  const activeUploads = uploads.filter((u) => !u.url && !u.error);
  const completedUploads = uploads.filter((u) => u.url);
  const failedUploads = uploads.filter((u) => u.error);

  // Helper to get file type from upload
  const getFileType = (file: File): "image" | "video" => {
    return file.type.startsWith("video/") ? "video" : "image";
  };

  return (
    <div className="space-y-4">
      {/* Existing Media */}
      {(existingImageUrls.length > 0 || existingVideoUrls.length > 0) && (
        <div>
          <label className="text-sm font-medium mb-2 block">Existing Media</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {existingImageUrls.map((url, index) => (
              <div key={`img-${index}`} className="relative group">
                <Image
                  src={url}
                  alt={`Existing image ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border"
                  width={128}
                  height={128}
                  unoptimized
                />
                {onRemoveExisting && (
                  <button
                    type="button"
                    onClick={() => removeExisting(url, "image")}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {existingVideoUrls.map((url, index) => (
              <div key={`vid-${index}`} className="relative group">
                <video
                  src={url}
                  className="w-full h-32 object-cover rounded-lg border"
                  controls={false}
                  muted
                >
                  Your browser does not support video.
                </video>
                <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Video className="h-3 w-3" />
                  Video
                </div>
                {onRemoveExisting && (
                  <button
                    type="button"
                    onClick={() => removeExisting(url, "video")}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove video"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Zone */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Upload {allowVideos ? "Media" : "Images"}
        </label>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400",
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptString}
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex justify-center gap-2 mb-4">
            <ImageIcon className="h-12 w-12 text-gray-400" />
            {allowVideos && <Video className="h-12 w-12 text-gray-400" />}
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Drag and drop {allowVideos ? "images or videos" : "images"} here, or{" "}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              click to select
            </button>
          </p>
          <p className="text-xs text-gray-500">
            Accepted: {allowVideos ? (
              <>JPG, PNG, WebP images or MP4, MOV, WebM, AVI videos (images: max {maxSizeMB}MB, videos: max {maxSizeMB * 10}MB per file)</>
            ) : (
              <>JPG, PNG, WebP (max {maxSizeMB}MB per file)</>
            )}
          </p>
        </div>
      </div>

      {/* Upload Progress */}
      {activeUploads.length > 0 && (
        <div className="space-y-2">
          {activeUploads.map((upload, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate flex-1">{upload.file.name}</span>
                <span className="text-gray-500 ml-2">{upload.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed Uploads */}
      {completedUploads.length > 0 && (
        <div>
          <label className="text-sm font-medium mb-2 block">Uploaded Media</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {completedUploads.map((upload, index) => {
              const isVideo = upload.type === "video";
              return (
                <div key={index} className="relative group">
                  {isVideo ? (
                    <video
                      src={upload.url}
                      className="w-full h-32 object-cover rounded-lg border"
                      controls={false}
                      muted
                    >
                      Your browser does not support video.
                    </video>
                  ) : upload.url ? (
                    <Image
                      src={upload.url}
                      alt={`Uploaded ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                      width={128}
                      height={128}
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-200 rounded-lg border flex items-center justify-center">
                      <span className="text-gray-500 text-sm">Uploading...</span>
                    </div>
                  )}
                  {isVideo && (
                    <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Video className="h-3 w-3" />
                      Video
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeUpload(upload.file)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove media"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Failed Uploads */}
      {failedUploads.length > 0 && (
        <div className="space-y-2">
          {failedUploads.map((upload, index) => (
            <div
              key={index}
              className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-red-800">{upload.file.name}</span>
                <button
                  type="button"
                  onClick={() => removeUpload(upload.file)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-red-600 mt-1">{upload.error}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

