/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useEffect, useState } from 'react';
import { Edit2, Trash2, Video, Image as ImageIcon, Sparkles, ExternalLink, Loader2, Play, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import VideoPlayerModal from './VideoPlayerModal';

interface TaskCardProps {
  task: any;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewMoments?: () => void;
  onClick?: () => void;
  onUpdate?: () => void | Promise<void>; // Add this prop
}

export default function TaskCard({ task, onEdit, onDelete, onViewMoments, onClick, onUpdate }: TaskCardProps) {
  const { getIdToken } = useAuth();
  const [media, setMedia] = useState<any[]>(task.media || []);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<any>(null);
  
  useEffect(() => {
    // Load media if not already provided
    if (!task.media || task.media.length === 0) {
      loadMedia();
    } else {
      setMedia(task.media);
    }
  }, [task.id]);
  
  async function loadMedia() {
    setLoadingMedia(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      
      // Load from Firestore
      const response = await fetch(`/api/admin/tasks/${task.id}/media`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`Loaded ${data.media.length} media files for job ${task.id}`);
        setMedia(data.media);
      } else {
        console.error('Failed to load media:', data.error);
      }
    } catch (error) {
      console.error('Failed to load media:', error);
    } finally {
      setLoadingMedia(false);
    }
  }
  
  return (
    <div 
      onClick={onClick || undefined}
      className={`p-6 transition-colors ${onClick ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-gray-900">{task.title}</h3>
            {task.category && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                {task.category}
              </span>
            )}
            {task.priority && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                task.priority === 'high' ? 'bg-red-100 text-red-700' :
                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {task.priority}
              </span>
            )}
          </div>
          
          {task.description && (
            <p className="text-sm text-gray-600 mb-3">{task.description}</p>
          )}
          
          {/* Floor Assignment & Context Path */}
          {(task.floor_name || task.room || task.target || task.action) && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3 flex-wrap">
              {task.floor_name && (
                <>
                  <div className="flex items-center gap-1">
                    <MapPin size={14} />
                    <span className="font-medium">{task.floor_name}</span>
                  </div>
                  {(task.room || task.target || task.action) && <span>→</span>}
                </>
              )}
              {task.room && (
                <>
                  <span>{task.room}</span>
                  {(task.target || task.action) && <span>→</span>}
                </>
              )}
              {task.target && (
                <>
                  <span>{task.target}</span>
                  {task.action && <span>→</span>}
                </>
              )}
              {task.action && (
                <span className="font-medium">{task.action}</span>
              )}
            </div>
          )}
          
          {/* Media Display */}
          {loadingMedia ? (
            <div className="text-xs text-gray-500 mb-3 flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading media...
            </div>
          ) : media.length > 0 ? (
            <div className="mb-3">
              <div className="flex flex-wrap gap-2">
                {media.map((item: any) => (
                  <button
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click (modal opening)
                      if (item.mediaType === 'video' || item.fileType?.includes('video')) {
                        setPlayingVideo(item); // Play video in modal
                      } else {
                        window.open(item.storageUrl, '_blank'); // Open image in new tab
                      }
                    }}
                    className="group relative"
                    title={item.fileName}
                  >
                    <div className={`w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-colors ${
                      item.mediaType === 'video' ? 'bg-purple-50' : 'bg-blue-50'
                    }`}>
                      {item.mediaType === 'video' ? (
                        <div className="w-full h-full flex items-center justify-center relative">
                          <Video className="h-8 w-8 text-purple-600" />
                          {/* Play button overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all">
                            <Play className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ) : item.thumbnailUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img 
                          src={item.thumbnailUrl} 
                          alt={item.fileName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-blue-600" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {media.filter((m: any) => m.mediaType === 'video').length} video(s), {media.filter((m: any) => m.mediaType === 'image').length} image(s)
              </p>
            </div>
          ) : null}
          
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {task.estimated_duration_minutes && (
              <span>~{task.estimated_duration_minutes} min</span>
            )}
            {task.moment_count > 0 && onViewMoments && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewMoments();
                }}
                className="flex items-center gap-1 text-purple-600 hover:text-purple-700"
              >
                <Sparkles className="h-3 w-3" />
                {task.moment_count} moments
              </button>
            )}
            {media.length > 0 && (
              <span className="flex items-center gap-1">
                <Video className="h-3 w-3" />
                {media.length} media
              </span>
            )}
          </div>
        </div>
        
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                aria-label="Edit task"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                aria-label="Delete task"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Video Player Modal - Higher z-index to appear above task details modal */}
      {playingVideo && (
        <div className="fixed inset-0 z-[60]">
          <VideoPlayerModal
            videoUrl={playingVideo.storageUrl}
            fileName={playingVideo.fileName || 'Video'}
            onClose={() => setPlayingVideo(null)}
          />
        </div>
      )}
    </div>
  );
}

