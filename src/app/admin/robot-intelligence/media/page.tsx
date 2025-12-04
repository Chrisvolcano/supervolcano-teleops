'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  Film, Play, Clock, CheckCircle, XCircle, RefreshCw, Loader2, X,
  ChevronLeft, ChevronRight, Square, CheckSquare, Minus, Star, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface MediaItem {
  id: string;
  url: string;
  fileName: string;
  locationId?: string;
  locationName?: string;
  aiStatus: 'pending' | 'processing' | 'completed' | 'failed';
  aiAnnotations?: any;
  uploadedAt: string | null;
  duration?: number;
  size?: number;
  aiError?: string | null;
  // Training workflow
  trainingStatus?: 'pending' | 'approved' | 'rejected';
  // AI classification fields
  aiRoomType?: string;
  aiActionTypes?: string[];
  aiObjectLabels?: string[];
  aiQualityScore?: number;
}

interface QueueStats {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  pendingApproval?: number;
  approved?: number;
  rejected?: number;
}

export default function MediaLibraryPage() {
  const { getIdToken } = useAuth();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  
  // Modal state
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);
  
  // Action state
  const [singleActionLoading, setSingleActionLoading] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const selectedVideo = selectedVideoIndex !== null ? media[selectedVideoIndex] : null;

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
      if (data.stats) {
        setStats(data.stats);
      }
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
      
      await fetchMedia();
      await fetchQueueStats();
      toast.success('Video processing started');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Processing failed';
      setError(message);
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  // Selection handlers
  const toggleSelection = (id: string, event?: React.MouseEvent) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      
      // Shift+click for range selection
      if (event?.shiftKey && lastSelectedId) {
        const currentIndex = media.findIndex(v => v.id === id);
        const lastIndex = media.findIndex(v => v.id === lastSelectedId);
        
        if (currentIndex >= 0 && lastIndex >= 0) {
          const [start, end] = [Math.min(currentIndex, lastIndex), Math.max(currentIndex, lastIndex)];
          
          for (let i = start; i <= end; i++) {
            next.add(media[i].id);
          }
        }
      } else {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      
      return next;
    });
    setLastSelectedId(id);
  };

  const selectAll = () => {
    const allIds = media.map(v => v.id);
    setSelectedIds(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  };

  const allSelected = media.length > 0 && media.every(v => selectedIds.has(v.id));
  const someSelected = selectedIds.size > 0;

  // Modal navigation
  const openVideoModal = (index: number) => {
    setSelectedVideoIndex(index);
  };

  const navigateModal = (direction: 'prev' | 'next') => {
    if (selectedVideoIndex === null) return;
    
    const newIndex = direction === 'prev' 
      ? Math.max(0, selectedVideoIndex - 1)
      : Math.min(media.length - 1, selectedVideoIndex + 1);
    
    setSelectedVideoIndex(newIndex);
  };

  const closeModal = () => {
    setSelectedVideoIndex(null);
  };

  // Single action handler
  const handleSingleAction = async (mediaId: string, action: 'approve' | 'reject') => {
    if (singleActionLoading) return;
    
    setSingleActionLoading(true);
    
    try {
      const token = await getIdToken();
      const response = await fetch(`/api/admin/videos/${mediaId}/approve-training`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        setMedia(prev => prev.map(v => 
          v.id === mediaId ? { ...v, trainingStatus: newStatus } : v
        ));
        toast.success(`Video ${action === 'approve' ? 'approved' : 'rejected'} for training`);
        
        // Auto-advance to next pending video
        if (selectedVideoIndex !== null) {
          const currentVideo = media[selectedVideoIndex];
          if (currentVideo && currentVideo.aiStatus === 'completed') {
            const nextPendingIndex = media.findIndex((v, idx) => 
              idx > selectedVideoIndex && 
              v.aiStatus === 'completed' && 
              (v.trainingStatus === 'pending' || !v.trainingStatus)
            );
            if (nextPendingIndex >= 0) {
              setSelectedVideoIndex(nextPendingIndex);
            } else {
              closeModal();
            }
          }
        }
      } else {
        throw new Error(result.error || 'Action failed');
      }
    } catch (err: any) {
      console.error('Single action failed:', err);
      toast.error(err.message || 'Action failed');
    } finally {
      setSingleActionLoading(false);
    }
  };

  // Bulk action handler
  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedIds.size === 0 || bulkActionLoading) return;
    
    setBulkActionLoading(true);
    
    try {
      const token = await getIdToken();
      const response = await fetch('/api/admin/videos/approve-training', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mediaIds: Array.from(selectedIds),
          action,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        
        setMedia(prev => prev.map(v => 
          result.succeeded?.includes(v.id)
            ? { ...v, trainingStatus: newStatus }
            : v
        ));
        
        // Show results toast
        const message = result.failed?.length > 0
          ? `${result.succeeded.length} ${action}d, ${result.failed.length} failed`
          : `${result.succeeded.length} videos ${action}d`;
        
        toast.success(message);
        
        // Clear selection
        clearSelection();
      } else {
        throw new Error(result.error || 'Bulk action failed');
      }
    } catch (err: any) {
      console.error('Bulk action failed:', err);
      toast.error(err.message || 'Bulk action failed');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedVideoIndex === null) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          navigateModal('prev');
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateModal('next');
          break;
        case 'Escape':
          e.preventDefault();
          closeModal();
          break;
        case 'a':
        case 'A':
          if (selectedVideo && selectedVideo.aiStatus === 'completed' && selectedVideo.trainingStatus !== 'approved') {
            e.preventDefault();
            handleSingleAction(selectedVideo.id, 'approve');
          }
          break;
        case 'r':
        case 'R':
          if (selectedVideo && selectedVideo.aiStatus === 'completed' && selectedVideo.trainingStatus !== 'rejected') {
            e.preventDefault();
            handleSingleAction(selectedVideo.id, 'reject');
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedVideoIndex, selectedVideo]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-gray-400" />;
      case 'processing': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTrainingStatusBadge = (video: MediaItem) => {
    if (video.aiStatus !== 'completed') return null;
    
    const status = video.trainingStatus || 'pending';
    
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
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

  const renderQualityStars = (score?: number) => {
    if (!score) return null;
    const percentage = Math.round(score * 100);
    const stars = Math.round((score * 5));
    
    return (
      <div className="flex items-center gap-1">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={`w-3 h-3 ${
                i <= stars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-gray-500">{percentage}%</span>
      </div>
    );
  };

  const renderAIAnnotations = (video: MediaItem) => {
    if (video.aiStatus !== 'completed' || !video.aiAnnotations) return null;

    const annotations = video.aiAnnotations;
    const labels = annotations.labels || [];
    const objects = annotations.objects || [];
    const objectLabels = video.aiObjectLabels || [];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm">AI Analysis</h4>
          {video.aiQualityScore && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Quality:</span>
              {renderQualityStars(video.aiQualityScore)}
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          {video.aiRoomType && (
            <div>
              <span className="text-xs text-gray-500">Room Type:</span>{' '}
              <span className="text-sm font-medium">🏠 {video.aiRoomType}</span>
            </div>
          )}
          
          {video.aiActionTypes && video.aiActionTypes.length > 0 && (
            <div>
              <span className="text-xs text-gray-500">Actions:</span>{' '}
              <span className="text-sm font-medium">
                {video.aiActionTypes.map(a => `🧹 ${a}`).join(', ')}
              </span>
            </div>
          )}
          
          {objectLabels.length > 0 && (
            <div>
              <span className="text-xs text-gray-500 block mb-2">Objects Detected:</span>
              <div className="flex flex-wrap gap-2">
                {objectLabels.slice(0, 8).map((label, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-gray-100 rounded text-xs font-medium"
                  >
                    {label}
                  </span>
                ))}
                {objectLabels.length > 8 && (
                  <span className="px-2 py-1 text-xs text-gray-500">
                    +{objectLabels.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto pb-24">
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
        <div className="grid grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-400">{stats.queued || 0}</div>
            <div className="text-sm text-gray-500">Queued</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-blue-500">{stats.processing || 0}</div>
            <div className="text-sm text-gray-500">Processing</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-green-500">{stats.completed || 0}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-red-500">{stats.failed || 0}</div>
            <div className="text-sm text-gray-500">Failed</div>
          </div>
          {stats.pendingApproval !== undefined && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-yellow-500">{stats.pendingApproval}</div>
              <div className="text-sm text-gray-500">Pending Approval</div>
            </div>
          )}
          {stats.approved !== undefined && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              <div className="text-sm text-gray-500">Approved</div>
            </div>
          )}
          {stats.rejected !== undefined && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-sm text-gray-500">Rejected</div>
            </div>
          )}
        </div>
      )}

      {/* Filter */}
      <div className="mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
        >
          <option value="all">All Videos</option>
          <optgroup label="AI Status">
            <option value="pending">Pending Processing</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </optgroup>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Media Table */}
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
                <th className="px-4 py-3 w-12">
                  <button
                    onClick={() => allSelected ? clearSelection() : selectAll()}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    {allSelected ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : someSelected ? (
                      <Minus className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Video</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">AI Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Training</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {media.map((item, index) => {
                const isSelected = selectedIds.has(item.id);
                const rowBgColor = 
                  item.trainingStatus === 'approved' ? 'bg-green-50/50' :
                  item.trainingStatus === 'rejected' ? 'bg-red-50/50' :
                  isSelected ? 'bg-blue-50' : '';
                
                return (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${rowBgColor}`}
                  >
                    <td 
                      className="px-4 py-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelection(item.id, e);
                      }}
                    >
                      <button className="p-1 hover:bg-gray-200 rounded">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td 
                      className="px-4 py-3"
                      onClick={() => openVideoModal(index)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-10 bg-gray-200 rounded flex items-center justify-center">
                          <Film className="w-5 h-5 text-gray-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                          {item.fileName || item.id.slice(0, 8) + '...'}
                        </span>
                      </div>
                    </td>
                    <td 
                      className="px-4 py-3 text-sm text-gray-600"
                      onClick={() => openVideoModal(index)}
                    >
                      {item.locationName || item.locationId?.slice(0, 8) || '-'}
                    </td>
                    <td 
                      className="px-4 py-3 text-sm text-gray-600"
                      onClick={() => openVideoModal(index)}
                    >
                      {formatDuration(item.duration)}
                    </td>
                    <td 
                      className="px-4 py-3 text-sm text-gray-600"
                      onClick={() => openVideoModal(index)}
                    >
                      {formatFileSize(item.size)}
                    </td>
                    <td 
                      className="px-4 py-3"
                      onClick={() => openVideoModal(index)}
                    >
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.aiStatus)}
                        <span className="text-sm capitalize">{item.aiStatus}</span>
                      </div>
                    </td>
                    <td 
                      className="px-4 py-3"
                      onClick={() => openVideoModal(index)}
                    >
                      {getTrainingStatusBadge(item)}
                    </td>
                    <td 
                      className="px-4 py-3 text-sm text-gray-500"
                      onClick={() => openVideoModal(index)}
                    >
                      {item.uploadedAt ? new Date(item.uploadedAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              <span className="font-medium">
                {selectedIds.size} video{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Clear selection
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleBulkAction('reject')}
                disabled={bulkActionLoading}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                Reject Selected
              </button>
              <button
                onClick={() => handleBulkAction('approve')}
                disabled={bulkActionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {bulkActionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Approve Selected
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Video Detail Modal */}
      {selectedVideo && selectedVideoIndex !== null && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-lg max-w-4xl w-full my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-lg truncate pr-4">
                {selectedVideo.fileName || selectedVideo.id}
              </h3>
              <button 
                onClick={closeModal}
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
            
            {/* AI Analysis Section */}
            {selectedVideo.aiStatus === 'completed' && (
              <div className="p-4 border-t border-b bg-gray-50">
                {renderAIAnnotations(selectedVideo)}
              </div>
            )}
            
            {/* Metadata */}
            <div className="p-4 space-y-3 text-sm">
              <div>
                <span className="text-gray-500 block mb-2">Training Status</span>
                <div className="flex items-center gap-2">
                  {getTrainingStatusBadge(selectedVideo) || (
                    <span className="text-gray-400 text-xs">Not processed</span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-3 border-t">
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
            </div>
            
            {/* Footer Actions */}
            {selectedVideo.aiStatus === 'completed' && (
              <div className="p-4 border-t flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigateModal('prev')}
                    disabled={selectedVideoIndex === 0}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-xs text-gray-500">
                    {selectedVideoIndex + 1} / {media.length}
                  </span>
                  <button
                    onClick={() => navigateModal('next')}
                    disabled={selectedVideoIndex === media.length - 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSingleAction(selectedVideo.id, 'reject')}
                    disabled={singleActionLoading || selectedVideo.trainingStatus === 'rejected'}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleSingleAction(selectedVideo.id, 'approve')}
                    disabled={singleActionLoading || selectedVideo.trainingStatus === 'approved'}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                  >
                    {singleActionLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Approve for Training
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
            
            {/* Keyboard shortcuts hint */}
            <div className="px-4 pb-4 text-xs text-gray-400">
              Keyboard: ← → navigate • A approve • R reject • Esc close
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// force rebuild Wed Dec  3 21:36:38 PST 2025
