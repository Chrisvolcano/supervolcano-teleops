/**
 * Location Media Tab
 * Displays all videos uploaded for a location
 * Premium, minimal design
 */

'use client';

import { useState, useEffect } from 'react';
import { Play, Calendar, User, Clock, Film, X, Download, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface MediaItem {
  id: string;
  videoUrl: string;
  storagePath: string;
  type: string;
  locationId: string;
  userId: string;
  organizationId: string;
  fileSize: number;
  status: string;
  uploadedAt: string;
}

interface LocationMediaTabProps {
  locationId: string;
}

export default function LocationMediaTab({ locationId }: LocationMediaTabProps) {
  const { getIdToken } = useAuth();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<MediaItem | null>(null);

  useEffect(() => {
    fetchMedia();
  }, [locationId]);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getIdToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`/api/admin/locations/${locationId}/media`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch media');
      }

      setMedia(data.media || []);
    } catch (err: any) {
      console.error('Error fetching media:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // Group media by date
  const groupedMedia = media.reduce((groups: Record<string, MediaItem[]>, item) => {
    const date = formatDate(item.uploadedAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(item);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <Film className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-gray-900 font-medium mb-1">Failed to load media</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchMedia}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Film className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-900 font-medium mb-1">No media yet</p>
          <p className="text-gray-500 text-sm">
            Videos recorded from the mobile app will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                {media.length} video{media.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={fetchMedia}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Refresh
            </button>
          </div>

          {/* Grouped by date */}
          {Object.entries(groupedMedia).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {date}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {items.map((item) => (
                  <VideoThumbnail
                    key={item.id}
                    item={item}
                    onClick={() => setSelectedVideo(item)}
                    formatTime={formatTime}
                    formatFileSize={formatFileSize}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <VideoModal
          video={selectedVideo}
          onClose={() => setSelectedVideo(null)}
          formatDate={formatDate}
          formatTime={formatTime}
          formatFileSize={formatFileSize}
        />
      )}
    </>
  );
}

// Video Thumbnail Component
function VideoThumbnail({
  item,
  onClick,
  formatTime,
  formatFileSize,
}: {
  item: MediaItem;
  onClick: () => void;
  formatTime: (date: string) => string;
  formatFileSize: (bytes: number) => string;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative aspect-video bg-gray-900 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
    >
      {/* Play icon overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Play className="w-5 h-5 text-gray-900 ml-1" fill="currentColor" />
        </div>
      </div>

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-white text-xs font-medium">
          {formatTime(item.uploadedAt)}
        </p>
        {item.fileSize && (
          <p className="text-white/70 text-xs">
            {formatFileSize(item.fileSize)}
          </p>
        )}
      </div>
    </button>
  );
}

// Video Modal Component
function VideoModal({
  video,
  onClose,
  formatDate,
  formatTime,
  formatFileSize,
}: {
  video: MediaItem;
  onClose: () => void;
  formatDate: (date: string) => string;
  formatTime: (date: string) => string;
  formatFileSize: (bytes: number) => string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl bg-white rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <p className="font-medium text-gray-900">
              {formatDate(video.uploadedAt)}
            </p>
            <p className="text-sm text-gray-500">
              {formatTime(video.uploadedAt)}
              {video.fileSize && ` • ${formatFileSize(video.fileSize)}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={video.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Player */}
        <div className="aspect-video bg-black">
          <video
            src={video.videoUrl}
            controls
            autoPlay
            className="w-full h-full"
          >
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Footer with metadata */}
        <div className="p-4 bg-gray-50 border-t">
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{video.userId.slice(0, 8)}...</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Uploaded {formatTime(video.uploadedAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

