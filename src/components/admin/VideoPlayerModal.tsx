'use client'

import { useEffect } from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

interface VideoPlayerModalProps {
  videoUrl: string;
  fileName?: string;
  onClose: () => void;
}

export default function VideoPlayerModal({ videoUrl, fileName, onClose }: VideoPlayerModalProps) {
  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="relative max-w-5xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">
            {fileName || 'Video'}
          </h3>
          <div className="flex items-center gap-2">
            <a
              href={videoUrl}
              download
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              title="Download video"
            >
              <Download className="h-5 w-5" />
            </a>
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="h-5 w-5" />
            </a>
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Video Player */}
        <video
          src={videoUrl}
          controls
          autoPlay
          className="w-full rounded-lg shadow-2xl"
          style={{ maxHeight: '80vh' }}
        >
          Your browser does not support the video tag.
        </video>
        
        {/* Instructions */}
        <p className="text-white text-sm text-center mt-4 opacity-75">
          Press ESC or click outside to close
        </p>
      </div>
    </div>
  );
}

