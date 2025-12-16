'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Loader2, AlertCircle } from 'lucide-react';

interface VideoThumbnailProps {
  src: string;
  alt?: string;
  className?: string;
  aspectRatio?: 'video' | 'square';
  captureTime?: number; // seconds into video to capture
  onClick?: () => void;
}

export function VideoThumbnail({
  src,
  alt = 'Video thumbnail',
  className = '',
  aspectRatio = 'video',
  captureTime = 1,
  onClick,
}: VideoThumbnailProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const handleLoadedMetadata = () => {
      // Seek to capture time (or 10% into video if too short)
      const seekTime = Math.min(captureTime, video.duration * 0.1);
      video.currentTime = seekTime;
    };

    const handleSeeked = () => {
      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size to video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setThumbnailUrl(dataUrl);
        setLoading(false);
      } catch (err) {
        console.error('Failed to capture video frame:', err);
        setError(true);
        setLoading(false);
      }
    };

    const handleError = () => {
      setError(true);
      setLoading(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);

    // Start loading
    video.load();

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
    };
  }, [src, captureTime]);

  const aspectClass = aspectRatio === 'square' ? 'aspect-square' : 'aspect-video';

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-gray-100 dark:bg-[#1a1a1a] ${aspectClass} ${className} ${onClick ? 'cursor-pointer group' : ''}`}
      onClick={onClick}
    >
      {/* Hidden video element for frame capture */}
      <video
        ref={videoRef}
        src={src}
        className="hidden"
        crossOrigin="anonymous"
        preload="metadata"
        muted
        playsInline
      />

      {/* Hidden canvas for frame extraction */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Loading state */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
          <AlertCircle className="w-6 h-6 mb-1" />
          <span className="text-xs">Failed to load</span>
        </div>
      )}

      {/* Thumbnail image */}
      {thumbnailUrl && !error && (
        <>
          <img
            src={thumbnailUrl}
            alt={alt}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Play button overlay */}
          {onClick && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
              <div className="w-12 h-12 rounded-full bg-white/90 dark:bg-black/70 flex items-center justify-center opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all shadow-lg">
                <Play className="w-5 h-5 text-gray-900 dark:text-white ml-0.5" fill="currentColor" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
