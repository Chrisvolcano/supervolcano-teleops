'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  Film, RefreshCw, Play, Clock, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, Square, CheckSquare, Minus, Star, X, Trash2, Database, Sparkles
} from 'lucide-react';

interface VideoItem {
  id: string;
  fileName: string;
  url: string;
  thumbnailUrl: string | null;
  locationId: string | null;
  locationName: string | null;
  uploadedAt: string | null;
  aiStatus: 'pending' | 'processing' | 'completed' | 'failed';
  aiAnnotations: any | null;
  aiError: string | null;
  duration: number | null;
  size: number | null;
  aiRoomType: string | null;
  aiActionTypes: string[];
  aiObjectLabels: string[];
  aiQualityScore: number | null;
  trainingStatus: 'pending' | 'approved' | 'rejected';
}

interface Stats {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
}

export default function MediaLibraryPage() {
  const { user } = useAuth();
  const [media, setMedia] = useState<VideoItem[]>([]);
  const [stats, setStats] = useState<Stats>({ queued: 0, processing: 0, completed: 0, failed: 0, pendingApproval: 0, approved: 0, rejected: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [singleActionLoading, setSingleActionLoading] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [objectsExpanded, setObjectsExpanded] = useState(false);
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);

  const fetchMedia = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const token = await user.getIdToken();
      const params = new URLSearchParams();
      if (filter && filter !== 'all') params.append('status', filter);
      params.append('limit', '200');
      
      const response = await fetch(`/api/admin/videos?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch videos');
      const data = await response.json();
      setMedia(data.videos || []);
      setStats(data.stats || { queued: 0, processing: 0, completed: 0, failed: 0, pendingApproval: 0, approved: 0, rejected: 0 });
      setTotalCount(data.pagination?.total || data.videos?.length || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, filter]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedVideoIndex === null) return;
      if (e.key === 'Escape') {
        setSelectedVideoIndex(null);
        setObjectsExpanded(false);
      }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); navigateModal(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); navigateModal(1); }
      else if ((e.key === 'a' || e.key === 'A') && media[selectedVideoIndex]?.aiStatus === 'completed') {
        handleSingleAction(media[selectedVideoIndex].id, 'approve');
      }
      else if ((e.key === 'r' || e.key === 'R') && media[selectedVideoIndex]?.aiStatus === 'completed') {
        handleSingleAction(media[selectedVideoIndex].id, 'reject');
      }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && !deleteLoading) {
        handleSingleDelete(media[selectedVideoIndex].id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedVideoIndex, media, deleteLoading]);

  // Reset objectsExpanded when selectedVideoIndex changes
  useEffect(() => {
    setObjectsExpanded(false);
  }, [selectedVideoIndex]);

  const navigateModal = (direction: number) => {
    if (selectedVideoIndex === null) return;
    const newIndex = selectedVideoIndex + direction;
    if (newIndex >= 0 && newIndex < media.length) {
      setSelectedVideoIndex(newIndex);
      setObjectsExpanded(false); // Reset expansion when navigating
    }
  };

  const toggleSelection = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (event.shiftKey && lastSelectedId) {
      const lastIndex = media.findIndex(v => v.id === lastSelectedId);
      const currentIndex = media.findIndex(v => v.id === id);
      const [start, end] = [Math.min(lastIndex, currentIndex), Math.max(lastIndex, currentIndex)];
      for (let i = start; i <= end; i++) newSelected.add(media[i].id);
    } else {
      if (newSelected.has(id)) newSelected.delete(id);
      else newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setLastSelectedId(id);
  };

  const selectAll = () => setSelectedIds(new Set(media.map(v => v.id)));
  const clearSelection = () => { setSelectedIds(new Set()); setLastSelectedId(null); };
  const allSelected = media.length > 0 && media.every(v => selectedIds.has(v.id));
  const someSelected = selectedIds.size > 0;

  const handleAnalyze = async (mediaId: string) => {
    if (!user || analyzeLoading) return;
    setAnalyzeLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/videos/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mediaId, action: 'process_single' }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Analysis failed');
      }
      if (!result.success) {
        throw new Error(result.error || 'Analysis did not complete');
      }
      // Refresh to get updated status
      await fetchMedia();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const handleReanalyze = async (mediaId: string) => {
    if (!user || reanalyzingId) return;
    setReanalyzingId(mediaId);
    setError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/videos/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mediaId, action: 'reanalyze' }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Re-analyze failed');
      }
      // Refresh to get updated data
      await fetchMedia();
      
      // Poll for completion (check every 2 seconds, max 30 times = 60 seconds)
      let attempts = 0;
      const maxAttempts = 30;
      const pollInterval = setInterval(async () => {
        attempts++;
        
        // Fetch fresh data
        try {
          const token = await user.getIdToken();
          const params = new URLSearchParams();
          if (filter && filter !== 'all') params.append('status', filter);
          params.append('limit', '200');
          
          const response = await fetch(`/api/admin/videos?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (response.ok) {
            const data = await response.json();
            const updatedVideo = data.videos?.find((v: VideoItem) => v.id === mediaId);
            
            if (updatedVideo && (updatedVideo.aiStatus === 'completed' || updatedVideo.aiStatus === 'failed')) {
              clearInterval(pollInterval);
              setReanalyzingId(null);
              await fetchMedia(); // Final refresh to update UI
              return;
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
        
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setReanalyzingId(null);
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setReanalyzingId(null);
    }
  };

  const handleSingleAction = async (mediaId: string, action: 'approve' | 'reject') => {
    if (!user || singleActionLoading) return;
    setSingleActionLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/videos/approve-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mediaIds: [mediaId], action }),
      });
      if (!response.ok) throw new Error('Action failed');
      await fetchMedia();
      if (selectedVideoIndex !== null) {
        const nextPending = media.findIndex((v, i) => i > selectedVideoIndex && v.aiStatus === 'completed' && v.trainingStatus === 'pending');
        if (nextPending !== -1) setSelectedVideoIndex(nextPending);
      }
    } catch (err: any) { setError(err.message); }
    finally { setSingleActionLoading(false); }
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedIds.size === 0 || bulkActionLoading || !user) return;
    setBulkActionLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/videos/approve-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mediaIds: Array.from(selectedIds), action }),
      });
      if (!response.ok) throw new Error('Bulk action failed');
      clearSelection();
      await fetchMedia();
    } catch (err: any) { setError(err.message); }
    finally { setBulkActionLoading(false); }
  };

  const handleSingleDelete = async (mediaId: string) => {
    if (!user || deleteLoading) return;
    if (!confirm('Delete this video? This cannot be undone.')) return;
    setDeleteLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/videos/${mediaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Delete failed');
      if (selectedVideoIndex !== null) {
        if (media.length <= 1) setSelectedVideoIndex(null);
        else if (selectedVideoIndex >= media.length - 1) setSelectedVideoIndex(selectedVideoIndex - 1);
      }
      await fetchMedia();
    } catch (err: any) { setError(err.message); }
    finally { setDeleteLoading(false); }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || bulkActionLoading || !user) return;
    if (!confirm(`Delete ${selectedIds.size} video(s)? This cannot be undone.`)) return;
    setBulkActionLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/videos/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mediaIds: Array.from(selectedIds) }),
      });
      if (!response.ok) throw new Error('Bulk delete failed');
      clearSelection();
      await fetchMedia();
    } catch (err: any) { setError(err.message); }
    finally { setBulkActionLoading(false); }
  };

  const processBatch = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await fetch('/api/admin/videos/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'process_batch', batchSize: 5 }),
      });
      await fetchMedia();
    } catch (err: any) { setError(err.message); }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    try { const date = new Date(d); return isNaN(date.getTime()) ? '-' : date.toLocaleDateString(); } catch { return '-'; }
  };
  const formatDuration = (s: number | null) => {
    if (!s || s <= 0) return '-';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };
  const formatSize = (b: number | null) => b ? `${(b / 1024 / 1024).toFixed(1)} MB` : '-';
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-gray-400" />;
      case 'processing': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };
  const getTrainingBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Approved</span>;
      case 'rejected': return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">Rejected</span>;
      default: return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">-</span>;
    }
  };
  const renderStars = (score: number | null) => {
    if (score === null) return '-';
    const stars = Math.round(score * 5);
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`w-3 h-3 ${i < stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
        ))}
        <span className="text-xs text-gray-500 ml-1">{Math.round(score * 100)}%</span>
      </div>
    );
  };

  const selectedVideo = selectedVideoIndex !== null ? media[selectedVideoIndex] : null;

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
          <p className="text-gray-500 mt-1">Manage and process video content for AI analysis</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchMedia} disabled={loading} className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={processBatch} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Play className="w-4 h-4" /> Process Batch
          </button>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div>
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
            <Film className="w-3 h-3" /> AI Processing
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white border rounded-lg p-4"><div className="text-2xl font-bold text-slate-600">{stats.queued}</div><div className="text-sm text-gray-500">Queued</div></div>
            <div className="bg-white border rounded-lg p-4"><div className="text-2xl font-bold text-blue-600">{stats.processing}</div><div className="text-sm text-gray-500">Processing</div></div>
            <div className="bg-white border rounded-lg p-4"><div className="text-2xl font-bold text-emerald-600">{stats.completed}</div><div className="text-sm text-gray-500">Completed</div></div>
            <div className="bg-white border rounded-lg p-4"><div className="text-2xl font-bold text-red-600">{stats.failed}</div><div className="text-sm text-gray-500">Failed</div></div>
          </div>
        </div>
        <div>
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
            <Database className="w-3 h-3" /> Training Corpus Approval
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4"><div className="text-2xl font-bold text-amber-600">{stats.pendingApproval}</div><div className="text-sm text-amber-700">Pending Review</div></div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4"><div className="text-2xl font-bold text-green-600">{stats.approved}</div><div className="text-sm text-green-700">Approved</div></div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4"><div className="text-2xl font-bold text-red-600">{stats.rejected}</div><div className="text-sm text-red-700">Rejected</div></div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border rounded-lg px-3 py-2 min-w-[180px]">
            <option value="all">All Videos ({totalCount})</option>
            <optgroup label="AI Status">
              <option value="pending">Pending Processing</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </optgroup>
          </select>
          <span className="text-sm text-gray-500">Showing {media.length} of {totalCount} videos</span>
        </div>
      </div>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="w-10 px-4 py-3 text-left">
                <button onClick={() => allSelected ? clearSelection() : selectAll()} className="p-1 hover:bg-gray-200 rounded">
                  {allSelected ? <CheckSquare className="w-5 h-5 text-blue-600" /> : someSelected ? <Minus className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-400" />}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">VIDEO</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">LOCATION</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">DURATION</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">SIZE</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">AI STATUS</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">TRAINING</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">CREATED</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />Loading...</td></tr>
            ) : media.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">No videos found</td></tr>
            ) : (
              media.map((item, index) => (
                <tr key={item.id} className={`border-b hover:bg-gray-50 cursor-pointer ${selectedIds.has(item.id) ? 'bg-blue-50' : ''} ${item.trainingStatus === 'approved' ? 'bg-green-50/30' : ''} ${item.trainingStatus === 'rejected' ? 'bg-red-50/30' : ''}`} onClick={() => setSelectedVideoIndex(index)}>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => toggleSelection(item.id, e)} className="p-1 hover:bg-gray-200 rounded">
                      {selectedIds.has(item.id) ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-400" />}
                    </button>
                  </td>
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center"><Film className="w-5 h-5 text-gray-400" /></div><span className="font-medium text-sm truncate max-w-[200px]">{item.fileName}</span></div></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.locationName || item.locationId?.slice(0, 8) || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDuration(item.duration)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatSize(item.size)}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2">{getStatusIcon(item.aiStatus)}<span className="text-sm capitalize">{item.aiStatus}</span></div></td>
                  <td className="px-4 py-3">{getTrainingBadge(item.trainingStatus)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(item.uploadedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-4 z-50">
          <div className="flex items-center gap-2"><CheckSquare className="w-5 h-5 text-blue-400" /><span className="font-medium">{selectedIds.size} selected</span></div>
          <div className="w-px h-6 bg-gray-700" />
          <button onClick={clearSelection} className="px-3 py-1 text-sm hover:bg-gray-800 rounded">Clear</button>
          <button onClick={handleBulkDelete} disabled={bulkActionLoading} className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded flex items-center gap-1"><Trash2 className="w-4 h-4" />Delete</button>
          <button onClick={() => handleBulkAction('reject')} disabled={bulkActionLoading} className="px-3 py-1 text-sm bg-orange-600 hover:bg-orange-700 rounded">Reject</button>
          <button onClick={() => handleBulkAction('approve')} disabled={bulkActionLoading} className="px-4 py-1 text-sm bg-green-600 hover:bg-green-700 rounded flex items-center gap-1">{bulkActionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}Approve</button>
        </div>
      )}

      {selectedVideo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setSelectedVideoIndex(null)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <button onClick={() => navigateModal(-1)} disabled={selectedVideoIndex === 0} className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30" title="Previous"><ChevronLeft className="w-5 h-5" /></button>
                <span className="text-sm text-gray-500">{(selectedVideoIndex ?? 0) + 1} of {media.length}</span>
                <button onClick={() => navigateModal(1)} disabled={selectedVideoIndex === media.length - 1} className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30" title="Next"><ChevronRight className="w-5 h-5" /></button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleSingleDelete(selectedVideo.id)} disabled={deleteLoading} className="p-2 hover:bg-red-100 text-red-600 rounded-lg" title="Delete"><Trash2 className="w-5 h-5" /></button>
                <button onClick={() => setSelectedVideoIndex(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-4 bg-black flex items-center justify-center"><video src={selectedVideo.url} controls autoPlay className="max-h-[60vh] max-w-full object-contain" /></div>
            <div className="p-6 space-y-4">
              <div><h2 className="text-lg font-semibold">{selectedVideo.fileName}</h2><p className="text-sm text-gray-500">{selectedVideo.locationName || 'Unknown location'} • {formatDate(selectedVideo.uploadedAt)}</p></div>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div><div className="text-gray-500">Duration</div><div className="font-medium">{formatDuration(selectedVideo.duration)}</div></div>
                <div><div className="text-gray-500">Size</div><div className="font-medium">{formatSize(selectedVideo.size)}</div></div>
                <div><div className="text-gray-500">AI Status</div><div className="font-medium flex items-center gap-1">{getStatusIcon(selectedVideo.aiStatus)}<span className="capitalize">{selectedVideo.aiStatus}</span></div></div>
                <div><div className="text-gray-500">Training</div><div>{getTrainingBadge(selectedVideo.trainingStatus)}</div></div>
              </div>

              {/* Analyze Section - Show when pending */}
              {selectedVideo.aiStatus === 'pending' && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">Ready for AI Analysis</div>
                        <div className="text-sm text-slate-500">Extract labels, detect actions, and score quality</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleAnalyze(selectedVideo.id)} 
                      disabled={analyzeLoading}
                      className="px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {analyzeLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Analyze
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Processing Section - Show when processing */}
              {selectedVideo.aiStatus === 'processing' && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                    <div>
                      <div className="font-medium text-blue-900">Analysis in Progress</div>
                      <div className="text-sm text-blue-600">This may take a few moments...</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Failed Section - Show when failed */}
              {selectedVideo.aiStatus === 'failed' && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <div>
                        <div className="font-medium text-red-900">Analysis Failed</div>
                        <div className="text-sm text-red-600">{selectedVideo.aiError || 'An error occurred during processing'}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleAnalyze(selectedVideo.id)} 
                      disabled={analyzeLoading}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm disabled:opacity-50"
                    >
                      {analyzeLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {/* AI Analysis Results - Show when completed or reanalyzing */}
              {reanalyzingId === selectedVideo.id ? (
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-center gap-3 py-8">
                    <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                    <div>
                      <div className="font-medium">Re-analyzing video...</div>
                      <div className="text-sm text-gray-500">This may take 1-2 minutes</div>
                    </div>
                  </div>
                </div>
              ) : selectedVideo.aiStatus === 'completed' ? (
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      AI Analysis
                    </span>
                    <button
                      onClick={() => handleReanalyze(selectedVideo.id)}
                      disabled={reanalyzingId === selectedVideo.id}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${reanalyzingId === selectedVideo.id ? 'animate-spin' : ''}`} />
                      {reanalyzingId === selectedVideo.id ? 'Processing...' : 'Re-analyze'}
                    </button>
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><div className="text-gray-500 mb-1">Quality Score</div>{renderStars(selectedVideo.aiQualityScore)}</div>
                    <div><div className="text-gray-500 mb-1">Room Type</div><div className="font-medium capitalize">{selectedVideo.aiRoomType?.replace(/_/g, ' ') || 'Unknown'}</div></div>
                    {selectedVideo.aiActionTypes?.length > 0 && <div><div className="text-gray-500 mb-1">Actions</div><div className="font-medium capitalize">{selectedVideo.aiActionTypes.join(', ')}</div></div>}
                    {selectedVideo.aiObjectLabels?.length > 0 && (
                      <div className="col-span-2">
                        <div className="text-gray-500 mb-1 flex items-center justify-between">
                          <span>Objects ({selectedVideo.aiObjectLabels.length})</span>
                          {selectedVideo.aiObjectLabels.length > 8 && (
                            <button 
                              onClick={() => setObjectsExpanded(!objectsExpanded)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              {objectsExpanded ? 'Show less' : 'Show all'}
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(objectsExpanded ? selectedVideo.aiObjectLabels : selectedVideo.aiObjectLabels.slice(0, 8)).map((label, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs">{label}</span>
                          ))}
                          {!objectsExpanded && selectedVideo.aiObjectLabels.length > 8 && (
                            <button 
                              onClick={() => setObjectsExpanded(true)}
                              className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-500 hover:bg-gray-200"
                            >
                              +{selectedVideo.aiObjectLabels.length - 8} more
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Training Corpus Section - Show when completed */}
              {selectedVideo.aiStatus === 'completed' && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2"><Database className="w-4 h-4 text-blue-500" />Training Corpus</h3>
                  {selectedVideo.trainingStatus === 'pending' && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">Ready for review. Approve to add to training corpus.</div>
                      <button onClick={() => handleSingleAction(selectedVideo.id, 'reject')} disabled={singleActionLoading} className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm">Reject (R)</button>
                      <button onClick={() => handleSingleAction(selectedVideo.id, 'approve')} disabled={singleActionLoading} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm">{singleActionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}Approve (A)</button>
                    </div>
                  )}
                  {selectedVideo.trainingStatus === 'approved' && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" />Added to training corpus</div>}
                  {selectedVideo.trainingStatus === 'rejected' && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2"><XCircle className="w-4 h-4" />Rejected from training corpus</div>}
                </div>
              )}

              <div className="text-xs text-gray-400 border-t pt-3 mt-4">Keyboard: ← → navigate • A approve • R reject • Del delete • Esc close</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
