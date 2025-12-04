'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { GraduationCap, Star, RefreshCw, X, ChevronLeft, ChevronRight, Database, Trash2 } from 'lucide-react';

interface TrainingVideo {
  id: string;
  video_url: string;
  thumbnail_url?: string;
  room_type: string | null;
  action_types: string[];
  object_labels: string[];
  technique_tags: string[];
  quality_score: number;
  is_featured: boolean;
  created_at: string;
  duration_seconds?: number;
}

interface TrainingStats {
  total: number;
  room_types: number;
  avg_quality: number;
  total_duration: number;
}

export default function TrainingLibraryPage() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomFilter, setRoomFilter] = useState<string>('');
  const [objectFilter, setObjectFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'newest' | 'quality' | 'duration'>('newest');
  const [qualityThreshold, setQualityThreshold] = useState(0);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchTraining = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const token = await user.getIdToken();
      
      const params = new URLSearchParams();
      if (roomFilter) {
        params.set('roomType', roomFilter);
      }
      params.set('limit', '200');
      
      const response = await fetch(`/api/admin/training?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to fetch training data');
      
      const data = await response.json();
      setVideos(data.videos || []);
      setStats(data.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load training data');
    } finally {
      setLoading(false);
    }
  }, [user, roomFilter]);

  useEffect(() => {
    fetchTraining();
  }, [fetchTraining]);

  // Extract popular labels from all videos
  const popularLabels = useMemo(() => {
    const labelCounts: Record<string, number> = {};
    videos.forEach(v => {
      v.object_labels?.forEach(label => {
        labelCounts[label] = (labelCounts[label] || 0) + 1;
      });
    });
    return Object.entries(labelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label]) => label);
  }, [videos]);

  // Toggle label filter
  const toggleLabelFilter = (label: string) => {
    setObjectFilter(prev => 
      prev.includes(label) 
        ? prev.filter(l => l !== label)
        : [...prev, label]
    );
  };

  // Apply filters and sorting
  const filteredVideos = useMemo(() => {
    let result = [...videos];
    
    // Room filter
    if (roomFilter) {
      result = result.filter(v => v.room_type === roomFilter);
    }
    
    // Quality threshold
    result = result.filter(v => (v.quality_score || 0) * 100 >= qualityThreshold);
    
    // Object label filter
    if (objectFilter.length > 0) {
      result = result.filter(v => 
        objectFilter.some(label => v.object_labels?.includes(label))
      );
    }
    
    // Sort
    switch (sortBy) {
      case 'quality':
        result.sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0));
        break;
      case 'duration':
        result.sort((a, b) => (b.duration_seconds || 0) - (a.duration_seconds || 0));
        break;
      case 'newest':
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    
    return result;
  }, [videos, roomFilter, qualityThreshold, objectFilter, sortBy]);

  const selectedVideo = selectedVideoIndex !== null ? filteredVideos[selectedVideoIndex] : null;

  // Remove from training
  const handleRemoveFromTraining = async (videoId: string) => {
    if (!user || deleteLoading) return;
    if (!confirm('Remove this video from the training corpus? This cannot be undone.')) return;
    
    setDeleteLoading(true);
    try {
      const token = await user.getIdToken();
      
      // First, we need to update the source media in Firestore to reject it
      // Then remove from PostgreSQL training_videos table
      // For now, just update via API to reject the source media
      
      // Find the source media ID (would need to be stored in training_videos)
      // Since we don't have it directly, we'll need to add an endpoint to handle this
      // For MVP, we'll just show an error for now
      
      alert('Remove functionality requires source media ID. This feature needs backend support.');
      setDeleteLoading(false);
    } catch (err: any) {
      setError(err.message);
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderStars = (score: number) => {
    const stars = Math.round(score * 5);
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <Star 
            key={i} 
            className={`w-4 h-4 ${i <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} 
          />
        ))}
        <span className="text-xs text-gray-500 ml-1">{Math.round(score * 100)}%</span>
      </div>
    );
  };

  const navigateModal = (direction: number) => {
    if (selectedVideoIndex === null) return;
    const newIndex = selectedVideoIndex + direction;
    if (newIndex >= 0 && newIndex < filteredVideos.length) {
      setSelectedVideoIndex(newIndex);
    }
  };

  // Get unique room types from videos
  const roomTypes = useMemo(() => {
    const types = new Set(videos.map(v => v.room_type).filter(Boolean));
    return Array.from(types).sort();
  }, [videos]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training Library</h1>
          <p className="text-gray-500 mt-1">Curated video corpus for robot training (anonymized)</p>
        </div>
        <button
          onClick={() => fetchTraining()}
          disabled={loading}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{stats.total || 0}</div>
            <div className="text-sm text-gray-500">Total Videos</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-purple-500">{stats.room_types || 0}</div>
            <div className="text-sm text-gray-500">Room Types</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-blue-500">
              {stats.avg_quality ? Math.round(stats.avg_quality * 100) : 0}%
            </div>
            <div className="text-sm text-gray-500">Avg Quality</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-orange-500">
              {stats.total_duration ? Math.round(stats.total_duration / 60) : 0}m
            </div>
            <div className="text-sm text-gray-500">Total Duration</div>
          </div>
        </div>
      )}

      {/* Filter and Sort Controls */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <select 
          value={roomFilter} 
          onChange={(e) => setRoomFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 min-w-[180px]"
        >
          <option value="">All Room Types</option>
          {roomTypes.map(room => (
            <option key={room} value={room || ""}>
              {room?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>

        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value as 'newest' | 'quality' | 'duration')}
          className="border rounded-lg px-3 py-2 min-w-[160px]"
        >
          <option value="newest">Newest First</option>
          <option value="quality">Highest Quality</option>
          <option value="duration">Longest Duration</option>
        </select>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Min Quality:</span>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={qualityThreshold} 
            onChange={(e) => setQualityThreshold(Number(e.target.value))}
            className="w-24"
          />
          <span className="text-sm text-gray-600 w-10">{qualityThreshold}%</span>
        </div>
      </div>

      {/* Popular Labels Quick Filter */}
      {popularLabels.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-sm text-gray-500">Filter by:</span>
          {popularLabels.map(label => (
            <button
              key={label}
              onClick={() => toggleLabelFilter(label)}
              className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                objectFilter.includes(label) 
                  ? 'bg-blue-100 border-blue-300 text-blue-700' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
          {objectFilter.length > 0 && (
            <button
              onClick={() => setObjectFilter([])}
              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-gray-500 mb-4">
        Showing {filteredVideos.length} of {videos.length} videos
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Video Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <GraduationCap className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No training videos found</p>
          <p className="text-sm text-gray-400 mt-1">Videos are added to training library after approval</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredVideos.map((video, index) => (
            <div
              key={video.id}
              className="bg-white rounded-lg border overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedVideoIndex(index)}
            >
              {/* Thumbnail with overlays */}
              <div className="relative aspect-video bg-gray-100">
                <video 
                  src={video.video_url} 
                  className="w-full h-full object-cover"
                  preload="metadata"
                  muted
                />
                {/* Room type badge - top left */}
                {video.room_type && (
                  <span className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded capitalize">
                    {video.room_type.replace('_', ' ')}
                  </span>
                )}
                {/* Duration badge - top right */}
                {video.duration_seconds && (
                  <span className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                    {formatDuration(video.duration_seconds)}
                  </span>
                )}
                {video.is_featured && (
                  <span className="absolute bottom-2 right-2 px-2 py-1 bg-yellow-400 text-yellow-900 text-xs rounded font-medium">
                    ⭐ Featured
                  </span>
                )}
              </div>

              {/* Card content */}
              <div className="p-3">
                {/* Quality stars */}
                {renderStars(video.quality_score)}

                {/* Object labels */}
                {video.object_labels && video.object_labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2 mt-2">
                    {video.object_labels.slice(0, 6).map((label, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        {label}
                      </span>
                    ))}
                    {video.object_labels.length > 6 && (
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 text-xs rounded">
                        +{video.object_labels.length - 6}
                      </span>
                    )}
                  </div>
                )}

                {/* Date added */}
                <div className="text-xs text-gray-400 mt-2">
                  Added {formatDate(video.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Preview Modal */}
      {selectedVideo && selectedVideoIndex !== null && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setSelectedVideoIndex(null)}
        >
          <div 
            className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigateModal(-1)} 
                  disabled={selectedVideoIndex === 0}
                  className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                  title="Previous"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-500">
                  {(selectedVideoIndex ?? 0) + 1} of {filteredVideos.length}
                </span>
                <button 
                  onClick={() => navigateModal(1)} 
                  disabled={selectedVideoIndex === filteredVideos.length - 1}
                  className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                  title="Next"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSelectedVideoIndex(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video Player */}
            <div className="p-4 bg-black flex items-center justify-center">
              <video 
                src={selectedVideo.video_url} 
                controls 
                autoPlay
                className="max-h-[60vh] max-w-full object-contain"
              >
                Your browser does not support video playback.
              </video>
            </div>

            {/* Metadata */}
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-1">
                  {selectedVideo.room_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Training Video'}
                </h2>
                <p className="text-sm text-gray-500">
                  Added {formatDate(selectedVideo.created_at)}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-500 mb-1">Quality Score</div>
                  {renderStars(selectedVideo.quality_score)}
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Duration</div>
                  <div className="font-medium">{formatDuration(selectedVideo.duration_seconds)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Room Type</div>
                  <div className="font-medium capitalize">
                    {selectedVideo.room_type?.replace('_', ' ') || 'Unknown'}
                  </div>
                </div>
                {selectedVideo.action_types && selectedVideo.action_types.length > 0 && (
                  <div>
                    <div className="text-gray-500 mb-1">Actions</div>
                    <div className="font-medium capitalize">
                      {selectedVideo.action_types.join(', ')}
                    </div>
                  </div>
                )}
              </div>

              {/* Object Labels */}
              {selectedVideo.object_labels && selectedVideo.object_labels.length > 0 && (
                <div>
                  <div className="text-gray-500 mb-2">Detected Objects ({selectedVideo.object_labels.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedVideo.object_labels.map((label, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Training Corpus Info */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-sm">Training Corpus</span>
                </div>
                <div className="text-sm text-gray-600">
                  This video is part of the anonymized training corpus available to robot OEM partners.
                  {selectedVideo.is_featured && (
                    <span className="ml-2 inline-flex items-center gap-1 text-yellow-600">
                      <Star className="w-3 h-3 fill-current" />
                      Featured
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
