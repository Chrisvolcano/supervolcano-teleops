'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Loader2, Film } from 'lucide-react';

interface VideoThumbnailProps {
  src: string;
  thumbnailUrl?: string; // Pre-generated thumbnail if available
  alt?: string;
  className?: string;
  aspectRatio?: 'video' | 'square';
  captureTime?: number; // seconds into video to capture
  onClick?: () => void;
  showFallback?: boolean; // Show nice fallback instead of error
}

export function VideoThumbnail({
  src,
  thumbnailUrl: externalThumbnail,
  alt = 'Video thumbnail',
  className = '',
  aspectRatio = 'video',
  captureTime = 1,
  onClick,
  showFallback = true,
}: VideoThumbnailProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(externalThumbnail || null);
  const [loading, setLoading] = useState(!externalThumbnail);
  const [error, setError] = useState(false);

  useEffect(() => {
    // If we have an external thumbnail, use it
    if (externalThumbnail) {
      setThumbnailUrl(externalThumbnail);
      setLoading(false);
      return;
    }

    // If no src provided, show fallback
    if (!src) {
      setError(true);
      setLoading(false);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Set a timeout - if video doesn't load in 5 seconds, show fallback
    const timeout = setTimeout(() => {
      if (loading) {
        setError(true);
        setLoading(false);
      }
    }, 5000);

    const handleLoadedMetadata = () => {
      const seekTime = Math.min(captureTime, video.duration * 0.1);
      video.currentTime = seekTime;
    };

    const handleSeeked = () => {
      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setThumbnailUrl(dataUrl);
        setLoading(false);
        clearTimeout(timeout);
      } catch (err) {
        console.error('Failed to capture video frame:', err);
        setError(true);
        setLoading(false);
        clearTimeout(timeout);
      }
    };

    const handleError = () => {
      setError(true);
      setLoading(false);
      clearTimeout(timeout);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);

    video.load();

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      clearTimeout(timeout);
    };
  }, [src, externalThumbnail, captureTime, loading]);

  const aspectClass = aspectRatio === 'square' ? 'aspect-square' : 'aspect-video';

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-gray-100 dark:bg-[#1a1a1a] ${aspectClass} ${className} ${onClick ? 'cursor-pointer group' : ''}`}
      onClick={onClick}
    >
      {/* Hidden video element for frame capture */}
      {!externalThumbnail && src && (
        <video
          ref={videoRef}
          src={src}
          className="hidden"
          crossOrigin="anonymous"
          preload="metadata"
          muted
          playsInline
        />
      )}

      {/* Hidden canvas for frame extraction */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Loading state */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-gray-400 dark:text-gray-500 animate-spin" />
        </div>
      )}

      {/* Error/Fallback state - nicer looking */}
      {error && showFallback && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[#1f1f1f] dark:to-[#2a2a2a]">
          <Film className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-1" />
          {onClick && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-10 h-10 rounded-full bg-white/90 dark:bg-black/70 flex items-center justify-center shadow-lg">
                <Play className="w-4 h-4 text-gray-900 dark:text-white ml-0.5" fill="currentColor" />
              </div>
            </div>
          )}
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
