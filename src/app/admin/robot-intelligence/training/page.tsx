'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { GraduationCap, Star, Eye, Tag, RefreshCw, Loader2 } from 'lucide-react';

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
  view_count: number;
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
  const { getIdToken } = useAuth();
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomFilter, setRoomFilter] = useState<string>('');

  const fetchTraining = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getIdToken();
      
      const params = new URLSearchParams();
      if (roomFilter) {
        params.set('roomType', roomFilter);
      }
      
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
  }, [getIdToken, roomFilter]);

  useEffect(() => {
    fetchTraining();
  }, [fetchTraining]);

  const toggleFeatured = async (videoId: string, currentValue: boolean) => {
    try {
      const token = await getIdToken();
      
      await fetch('/api/admin/training', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: videoId,
          is_featured: !currentValue,
        }),
      });
      
      // Update local state
      setVideos(prev => prev.map(v => 
        v.id === videoId ? { ...v, is_featured: !currentValue } : v
      ));
    } catch (err) {
      setError('Failed to update video');
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.5) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

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
              {stats.avg_quality ? (stats.avg_quality * 100).toFixed(0) : 0}%
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

      {/* Filter */}
      <div className="mb-4">
        <select
          value={roomFilter}
          onChange={(e) => setRoomFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
        >
          <option value="">All Room Types</option>
          <option value="kitchen">Kitchen</option>
          <option value="bathroom">Bathroom</option>
          <option value="bedroom">Bedroom</option>
          <option value="living_room">Living Room</option>
          <option value="garage">Garage</option>
          <option value="outdoor">Outdoor</option>
        </select>
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
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <GraduationCap className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No training videos yet</p>
          <p className="text-sm text-gray-400 mt-1">Videos are added to training library after AI processing</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <div key={video.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gray-100">
                {video.thumbnail_url ? (
                  <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <GraduationCap className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                {video.is_featured && (
                  <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                    <Star className="w-3 h-3" /> Featured
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {video.room_type?.replace('_', ' ') || 'Unknown'}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${getQualityColor(video.quality_score)}`}>
                    {(video.quality_score * 100).toFixed(0)}% quality
                  </span>
                </div>
                
                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {video.action_types?.slice(0, 3).map((action, i) => (
                    <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      {action}
                    </span>
                  ))}
                  {(video.action_types?.length || 0) > 3 && (
                    <span className="text-xs text-gray-400">+{video.action_types.length - 3} more</span>
                  )}
                </div>
                
                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {video.view_count || 0}
                  </div>
                  <button
                    onClick={() => toggleFeatured(video.id, video.is_featured)}
                    className={`flex items-center gap-1 px-2 py-1 rounded ${
                      video.is_featured 
                        ? 'bg-yellow-100 text-yellow-700' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${video.is_featured ? 'fill-current' : ''}`} />
                    {video.is_featured ? 'Unfeature' : 'Feature'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

