'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Film, Play, Clock, CheckCircle, XCircle, RefreshCw, Loader2, X } from 'lucide-react';

interface MediaItem {
  id: string;
  url: string;
  fileName: string;
  locationId?: string;
  locationName?: string;
  aiStatus: 'pending' | 'processing' | 'completed' | 'failed';
  aiAnnotations?: Record<string, unknown>;
  uploadedAt: string | null;
  duration?: number;
  size?: number;
  aiError?: string | null;
}

interface QueueStats {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
}

export default function MediaLibraryPage() {
  const { getIdToken } = useAuth();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<MediaItem | null>(null);

  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getIdToken();
      
      const params = new URLSearchParams();
      if (filter && filter !== 'all') {
        params.set('status', filter);
      }
      
      const response = await fetch(`/api/admin/videos?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to fetch media');
      
      const data = await response.json();
      setMedia(data.videos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }, [getIdToken, filter]);

  const fetchQueueStats = useCallback(async () => {
    try {
      const token = await getIdToken();
      const response = await fetch('/api/admin/videos/process', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'queue_stats' }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load queue stats:', err);
    }
  }, [getIdToken]);

  useEffect(() => {
    fetchMedia();
    fetchQueueStats();
  }, [fetchMedia, fetchQueueStats]);

  const processVideos = async (action: 'process_batch' | 'retry_failed') => {
    try {
      setProcessing(true);
      const token = await getIdToken();
      
      const response = await fetch('/api/admin/videos/process', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, batchSize: 5 }),
      });
      
      if (!response.ok) throw new Error('Failed to process videos');
      
      await fetchMedia(); // Refresh list
      await fetchQueueStats(); // Refresh stats
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-gray-400" />;
      case 'processing': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
          <p className="text-gray-500 mt-1">Manage and process video content for AI analysis</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              fetchMedia();
              fetchQueueStats();
            }}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => processVideos('process_batch')}
            disabled={processing}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Process Batch
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-400">{stats.queued}</div>
            <div className="text-sm text-gray-500">Queued</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-blue-500">{stats.processing}</div>
            <div className="text-sm text-gray-500">Processing</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
            <div className="text-sm text-gray-500">Failed</div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
        >
          <option value="">All Videos</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Media Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : media.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Film className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No videos found</p>
          <p className="text-sm text-gray-400 mt-1">Videos uploaded during sessions will appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Video</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">AI Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {media.map((item) => (
                <tr 
                  key={item.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedVideo(item)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-10 bg-gray-200 rounded flex items-center justify-center">
                        <Film className="w-5 h-5 text-gray-400" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                        {item.fileName || item.id.slice(0, 8) + '...'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {item.locationName || item.locationId?.slice(0, 8) || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDuration(item.duration)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatFileSize(item.size)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.aiStatus)}
                      <span className="text-sm capitalize">{item.aiStatus}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {item.uploadedAt ? new Date(item.uploadedAt).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Video Preview Modal */}
      {selectedVideo && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setSelectedVideo(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-3xl w-full my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-lg truncate pr-4">{selectedVideo.fileName || selectedVideo.id}</h3>
              <button 
                onClick={() => setSelectedVideo(null)}
                className="p-2 hover:bg-gray-100 rounded-full flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Video Player */}
            <div className="bg-black flex items-center justify-center">
              {selectedVideo.url ? (
                <video 
                  src={selectedVideo.url} 
                  controls 
                  autoPlay
                  className="max-w-full max-h-[60vh] object-contain"
                >
                  Your browser does not support video playback.
                </video>
              ) : (
                <div className="flex items-center justify-center h-48 text-white">
                  No video URL available
                </div>
              )}
            </div>
            
            {/* Metadata */}
            <div className="p-4 space-y-3 text-sm border-t">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-500">Location:</span>{' '}
                  <span className="font-medium">{selectedVideo.locationName || selectedVideo.locationId || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-gray-500">AI Status:</span>{' '}
                  <span className="font-medium capitalize">{selectedVideo.aiStatus}</span>
                </div>
                <div>
                  <span className="text-gray-500">Duration:</span>{' '}
                  <span className="font-medium">{selectedVideo.duration ? `${Math.round(selectedVideo.duration)}s` : '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Size:</span>{' '}
                  <span className="font-medium">{selectedVideo.size ? `${(selectedVideo.size / 1024 / 1024).toFixed(1)} MB` : '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Uploaded:</span>{' '}
                  <span className="font-medium">
                    {selectedVideo.uploadedAt ? new Date(selectedVideo.uploadedAt).toLocaleString() : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Video ID:</span>{' '}
                  <span className="font-medium font-mono text-xs">{selectedVideo.id}</span>
                </div>
              </div>
              
              {selectedVideo.aiError && (
                <div className="pt-3 border-t">
                  <span className="text-red-600 font-medium block mb-2">AI Processing Error:</span>
                  <pre className="bg-red-50 p-3 rounded text-xs overflow-auto max-h-40 text-red-700">
                    {selectedVideo.aiError}
                  </pre>
                </div>
              )}

              {selectedVideo.aiAnnotations && (
                <div className="pt-3 border-t">
                  <span className="text-gray-500 block mb-2">AI Annotations:</span>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(selectedVideo.aiAnnotations, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

