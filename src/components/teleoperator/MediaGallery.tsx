"use client";

/**
 * Media Gallery Component
 * Full-screen lightbox for viewing images and videos
 * Supports swipe gestures, keyboard navigation, and pinch-to-zoom
 */

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MediaItem {
  url: string;
  type: "image" | "video";
  title?: string;
  room?: string;
}

interface MediaGalleryProps {
  media: MediaItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function MediaGallery({
  media,
  currentIndex,
  onClose,
  onNavigate,
}: MediaGalleryProps) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const currentMedia = media[currentIndex];
  const minSwipeDistance = 50;

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
      setIsVideoPlaying(false);
    }
  }, [currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (currentIndex < media.length - 1) {
      onNavigate(currentIndex + 1);
      setIsVideoPlaying(false);
    }
  }, [currentIndex, media.length, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrevious, onClose]);

  // Touch handlers for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < media.length - 1) {
      handleNext();
    } else if (isRightSwipe && currentIndex > 0) {
      handlePrevious();
    }
  };

  const handleVideoPlay = () => {
    if (videoRef) {
      if (isVideoPlaying) {
        videoRef.pause();
      } else {
        videoRef.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  if (!currentMedia) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
        onClick={onClose}
        aria-label="Close gallery"
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Navigation Arrows */}
      {currentIndex > 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10 h-12 w-12"
          onClick={(e) => {
            e.stopPropagation();
            handlePrevious();
          }}
          aria-label="Previous"
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
      )}

      {currentIndex < media.length - 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10 h-12 w-12"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          aria-label="Next"
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      )}

      {/* Media Content */}
      <div
        className="relative max-w-7xl w-full h-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm z-10">
            {currentIndex + 1} of {media.length}
          </div>

          {/* Caption */}
          {(currentMedia.title || currentMedia.room) && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-center z-10 max-w-2xl px-4">
              {currentMedia.title && (
                <p className="font-semibold text-lg mb-1">{currentMedia.title}</p>
              )}
              {currentMedia.room && (
                <p className="text-sm text-gray-300">Room: {currentMedia.room}</p>
              )}
            </div>
          )}

          {/* Image */}
          {currentMedia.type === "image" && (
            <Image
              src={currentMedia.url}
              alt={currentMedia.title || "Instruction image"}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              style={{ touchAction: "pan-y pinch-zoom" }}
              width={1200}
              height={800}
              unoptimized
            />
          )}

          {/* Video */}
          {currentMedia.type === "video" && (
            <div className="relative w-full max-w-4xl">
              <video
                ref={setVideoRef}
                src={currentMedia.url}
                controls
                className="w-full max-h-[90vh] rounded-lg"
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
                onEnded={() => setIsVideoPlaying(false)}
              >
                Your browser does not support the video tag.
              </video>
              {/* Custom play/pause overlay button (optional, for better UX) */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute bottom-4 right-4 text-white hover:bg-white/20 bg-black/50"
                onClick={handleVideoPlay}
                aria-label={isVideoPlaying ? "Pause" : "Play"}
              >
                {isVideoPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Dots Indicator (mobile-friendly) */}
      {media.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {media.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(index);
              }}
              className={cn(
                "h-2 rounded-full transition-all",
                index === currentIndex
                  ? "w-8 bg-white"
                  : "w-2 bg-white/50 hover:bg-white/75",
              )}
              aria-label={`Go to media ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

