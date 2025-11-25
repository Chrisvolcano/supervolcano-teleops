/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { X, Video, Clock, MapPin, Tag, AlertCircle, Loader2, Play } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import VideoPlayerModal from './VideoPlayerModal';

interface TaskDetailsModalProps {
  task: any;
  onClose: () => void;
}

export function TaskDetailsModal({ task, onClose }: TaskDetailsModalProps) {
  const { getIdToken } = useAuth();
  const [media, setMedia] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [playingVideo, setPlayingVideo] = useState<any | null>(null);

  useEffect(() => {
    loadMedia();
  }, [task.id]);

  async function loadMedia() {
    try {
      setLoadingMedia(true);
      
      // CRITICAL DEBUG LOGS
      console.log('═══════════════════════════════════════');
      console.log('🔍 MODAL MEDIA LOAD - START');
      console.log('═══════════════════════════════════════');
      console.log('Task ID:', task.id);
      console.log('Task object:', JSON.stringify(task, null, 2));
      console.log('API URL:', `/api/admin/tasks/${task.id}/media`);
      
      // Get authentication token
      const token = await getIdToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      console.log('Token obtained:', token ? 'YES' : 'NO');
      
      const response = await fetch(`/api/admin/tasks/${task.id}/media`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed response:', JSON.stringify(data, null, 2));
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error('Invalid JSON response');
      }
      
      console.log('Media array:', data.media);
      console.log('Media count:', data.media?.length || 0);
      
      if (data.media && data.media.length > 0) {
        console.log('First media item:', JSON.stringify(data.media[0], null, 2));
        data.media.forEach((item: any, idx: number) => {
          console.log(`Media ${idx}:`, {
            id: item.id,
            taskId: item.taskId,
            jobId: item.jobId,
            storageUrl: item.storageUrl?.substring(0, 100),
            mediaType: item.mediaType,
          });
        });
      } else {
        console.log('⚠️ No media found in response');
      }
      
      // Set the media state
      console.log('Setting media state with:', data.media?.length || 0, 'items');
      setMedia(data.media || []);
      
      // Verify state was set
      console.log('Media state should now be:', data.media?.length || 0);
      
      // Auto-select first video
      if (data.media && data.media.length > 0) {
        const firstVideo = data.media.find((m: any) => m.mediaType === 'video' || m.fileType?.includes('video'));
        if (firstVideo) {
          console.log('Auto-selecting first video:', firstVideo.storageUrl?.substring(0, 100));
          setSelectedVideo(firstVideo);
        } else {
          // If no video, select first media item
          console.log('No video found, selecting first media item');
          setSelectedVideo(data.media[0]);
        }
      } else {
        console.log('⚠️ No video to auto-select');
      }
      
      console.log('═══════════════════════════════════════');
      console.log('🔍 MODAL MEDIA LOAD - END');
      console.log('═══════════════════════════════════════');
      
    } catch (error: any) {
      console.error('❌ MODAL MEDIA LOAD - ERROR');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } finally {
      setLoadingMedia(false);
    }
  }

  const videos = media.filter((m: any) => m.mediaType === 'video' || m.fileType?.includes('video'));
  const images = media.filter((m: any) => m.mediaType === 'image' || m.fileType?.includes('image'));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {task.title}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {task.category && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {task.category}
                </span>
              )}
              {task.priority && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  task.priority === 'high' ? 'bg-red-100 text-red-800' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {task.priority}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Description */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Description
            </h3>
            <p className="text-slate-600">
              {task.description || 'No description provided'}
            </p>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {task.estimated_duration_minutes && (
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Duration</span>
                </div>
                <p className="text-slate-900 font-semibold">~{task.estimated_duration_minutes} min</p>
              </div>
            )}
            
            {task.locationName && (
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium">Location</span>
                </div>
                <p className="text-slate-900 font-semibold">{task.locationName}</p>
              </div>
            )}
          </div>

          {/* Media Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Video className="h-4 w-4" />
              Instructional Media ({media.length})
            </h3>
            
            {loadingMedia ? (
              <div className="bg-slate-100 rounded-lg p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                <p className="text-slate-600">Loading media...</p>
              </div>
            ) : media.length === 0 ? (
              <div className="bg-slate-50 rounded-lg p-8 text-center">
                <Video className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600">No media available yet</p>
                <p className="text-slate-500 text-sm mt-1">
                  Record videos in the mobile app to see them here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Video Player */}
                {selectedVideo && (
                  <div className="bg-black rounded-lg overflow-hidden">
                    <video
                      key={selectedVideo.storageUrl}
                      controls
                      className="w-full"
                      style={{ maxHeight: '400px' }}
                    >
                      <source src={selectedVideo.storageUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}

                {/* Video Thumbnails */}
                {videos.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Videos ({videos.length})</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {videos.map((item, index) => (
                        <button
                          key={item.id || index}
                          onClick={() => {
                            setSelectedVideo(item);
                            setPlayingVideo(item);
                          }}
                          className={`relative aspect-video bg-slate-100 rounded-lg overflow-hidden border-2 transition-all ${
                            selectedVideo?.id === item.id
                              ? 'border-indigo-600 shadow-lg'
                              : 'border-transparent hover:border-slate-300'
                          }`}
                        >
                          {item.thumbnailUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={item.thumbnailUrl}
                              alt={`Video ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Video className="h-6 w-6 text-slate-400" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <div className="bg-white/90 rounded-full p-2">
                              <Play className="h-4 w-4 text-slate-700" />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Images */}
                {images.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Images ({images.length})</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {images.map((item, index) => (
                        <button
                          key={item.id || index}
                          onClick={() => window.open(item.storageUrl, '_blank')}
                          className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden border-2 border-transparent hover:border-slate-300 transition-all"
                        >
                          {item.thumbnailUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={item.thumbnailUrl}
                              alt={`Image ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.storageUrl}
                                alt={`Image ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Media Info */}
                {selectedVideo && (
                  <div className="text-sm text-slate-600">
                    <p>
                      Uploaded: {new Date(selectedVideo.uploadedAt || Date.now()).toLocaleDateString()}
                    </p>
                    {selectedVideo.fileName && (
                      <p className="text-xs text-slate-500 mt-1">{selectedVideo.fileName}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Video Player Modal */}
      {playingVideo && (
        <VideoPlayerModal
          videoUrl={playingVideo.storageUrl}
          fileName={playingVideo.fileName || 'Video'}
          onClose={() => setPlayingVideo(null)}
        />
      )}
    </div>
  );
}

