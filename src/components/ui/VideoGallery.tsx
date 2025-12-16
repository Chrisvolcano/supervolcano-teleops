'use client';

import { useState } from 'react';
import { VideoThumbnail } from './VideoThumbnail';
import { VideoPreviewModal } from './VideoPreviewModal';
import { Film } from 'lucide-react';

interface Video {
  id: string;
  url: string;
  title?: string;
  fileName?: string;
  durationSeconds?: number;
  locationName?: string;
  roomType?: string;
}

interface VideoGalleryProps {
  videos: Video[];
  maxVisible?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
  emptyMessage?: string;
}

export function VideoGallery({
  videos,
  maxVisible = 5,
  showViewAll = true,
  onViewAll,
  emptyMessage = 'No videos available',
}: VideoGalleryProps) {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  const visibleVideos = videos.slice(0, maxVisible);
  const remainingCount = Math.max(0, videos.length - maxVisible);

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500">
        <Film className="w-8 h-8 mb-2" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {visibleVideos.map((video) => (
          <div key={video.id} className="flex-shrink-0 w-32">
            <VideoThumbnail
              src={video.url}
              alt={video.title || video.fileName || 'Video'}
              className="w-32 h-20 rounded-lg"
              aspectRatio="video"
              onClick={() => setSelectedVideo(video)}
            />
            {(video.roomType || video.durationSeconds) && (
              <div className="mt-1.5 px-0.5">
                {video.roomType && (
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                    {video.roomType}
                  </p>
                )}
                {video.durationSeconds && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {Math.floor(video.durationSeconds / 60)}:{(video.durationSeconds % 60).toString().padStart(2, '0')}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}

        {/* "More" card */}
        {remainingCount > 0 && showViewAll && (
          <div
            className="flex-shrink-0 w-32 h-20 rounded-lg bg-gray-100 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] flex items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-[#242424] transition-colors"
            onClick={onViewAll}
          >
            <span className="text-gray-600 dark:text-gray-400 font-medium">
              +{remainingCount} more
            </span>
          </div>
        )}
      </div>

      {/* Video preview modal */}
      {selectedVideo && (
        <VideoPreviewModal
          src={selectedVideo.url}
          title={selectedVideo.title || selectedVideo.fileName}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </>
  );
}
