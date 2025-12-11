'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, storage } from '@/lib/firebaseClient';
import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { 
  Film, RefreshCw, Play, Clock, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, ChevronDown, Square, CheckSquare, Minus, Star, X, Trash2, Database, Sparkles,
  Smartphone, HardDrive, Tag, AlertCircle, Upload, Loader2, Search
} from 'lucide-react';
import { TabNav } from '@/components/ui/TabNav';
import { OverviewTab } from '@/components/admin/media-library/OverviewTab';
import { BlurReviewTab } from '@/components/admin/media-library/BlurReviewTab';
import { LabelReviewTab } from '@/components/admin/media-library/LabelReviewTab';
import { ExportTab } from '@/components/admin/media-library/ExportTab';

export interface VideoItem {
  id: string;
  fileName: string;
  url: string;
  thumbnailUrl: string | null;
  locationId: string | null;
  locationName: string | null;
  uploadedAt: string | null;
  userId?: string | null;
  source?: string;
  reviewStatus?: 'pending' | 'approved' | 'rejected';
  blurStatus?: 'none' | 'processing' | 'complete' | 'failed';
  importSource?: string;
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
  faceDetectionStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  hasFaces?: boolean;
  faceCount?: number;
  faceTimestamps?: { startTime: number; endTime: number }[];
  faceDetectionError?: string;
}

interface Stats {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  blurPending: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
}

export default function MediaLibraryPage() {
  const { user } = useAuth();
  const [media, setMedia] = useState<VideoItem[]>([]);
  const [stats, setStats] = useState<Stats>({ queued: 0, processing: 0, completed: 0, failed: 0, blurPending: 0, pendingApproval: 0, approved: 0, rejected: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [trainingFilter, setTrainingFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'blur' | 'labels' | 'export'>('overview');
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [singleActionLoading, setSingleActionLoading] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [objectsExpanded, setObjectsExpanded] = useState(false);
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);
  const [blurringIds, setBlurringIds] = useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  
  // Import dropdown state
  const [showImportDropdown, setShowImportDropdown] = useState(false);
  
  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [importAttribution, setImportAttribution] = useState<string>('');
  const [importUploading, setImportUploading] = useState(false);
  const [importProgress, setImportProgress] = useState<Map<string, number>>(new Map());
  
  // Google Drive import state
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveAccessToken, setDriveAccessToken] = useState<string | null>(null);
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [driveFolderName, setDriveFolderName] = useState('');
  const [driveFiles, setDriveFiles] = useState<Array<{
    id: string;
    name: string;
    mimeType: string;
    size: number;
    selected: boolean;
  }>>([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveImporting, setDriveImporting] = useState(false);
  const [driveImportProgress, setDriveImportProgress] = useState(0);
  const [driveAttribution, setDriveAttribution] = useState('');

  const fetchMedia = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const token = await user.getIdToken();
      
      // Auto-fix stuck uploads first (silent)
      try {
        const fixResponse = await fetch('/api/admin/migrate/fix-stuck-uploads', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const fixData = await fixResponse.json();
        if (fixData.stats?.fixed > 0) {
          console.log(`[Media Library] Auto-fixed ${fixData.stats.fixed} stuck uploads`);
        }
      } catch (fixErr) {
        // Silent fail
      }
      
      // Then fetch videos
      const params = new URLSearchParams();
      if (filter && filter !== 'all') params.append('status', filter);
      params.append('limit', '200');
      
      const response = await fetch(`/api/admin/videos?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch videos');
      const data = await response.json();
      setMedia(data.videos || []);
      setStats(data.stats || { queued: 0, processing: 0, completed: 0, failed: 0, blurPending: 0, pendingApproval: 0, approved: 0, rejected: 0 });
      setTotalCount(data.pagination?.total || data.videos?.length || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, filter]);
  
  // Apply training status filter client-side
  const filteredMedia = useMemo(() => {
    if (trainingFilter === 'all') return media;
    
    return media.filter((v) => {
      if (trainingFilter === 'pending') {
        return v.trainingStatus === 'pending' && v.aiStatus === 'completed';
      }
      return v.trainingStatus === trainingFilter;
    });
  }, [media, trainingFilter]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  // Click-outside handler for import dropdown
  useEffect(() => {
    const handleClickOutside = () => setShowImportDropdown(false);
    if (showImportDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showImportDropdown]);

  // Restore Drive token from sessionStorage when modal opens
  useEffect(() => {
    const storedToken = sessionStorage.getItem('driveAccessToken');
    if (storedToken) {
      setDriveAccessToken(storedToken);
      setDriveConnected(true);
    }
  }, [showDriveModal]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedVideoIndex === null) return;
      if (e.key === 'Escape') {
        setSelectedVideoIndex(null);
        setObjectsExpanded(false);
      }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); navigateModal(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); navigateModal(1); }
      else if ((e.key === 'a' || e.key === 'A') && filteredMedia[selectedVideoIndex]?.aiStatus === 'completed') {
        handleSingleAction(filteredMedia[selectedVideoIndex].id, 'approve');
      }
      else if ((e.key === 'r' || e.key === 'R') && filteredMedia[selectedVideoIndex]?.aiStatus === 'completed') {
        handleSingleAction(filteredMedia[selectedVideoIndex].id, 'reject');
      }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && !deleteLoading) {
        handleSingleDelete(filteredMedia[selectedVideoIndex].id);
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
    if (newIndex >= 0 && newIndex < filteredMedia.length) {
      setSelectedVideoIndex(newIndex);
      setObjectsExpanded(false); // Reset expansion when navigating
    }
  };

  const toggleSelection = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (event.shiftKey && lastSelectedId) {
      const lastIndex = filteredMedia.findIndex(v => v.id === lastSelectedId);
      const currentIndex = filteredMedia.findIndex(v => v.id === id);
      const [start, end] = [Math.min(lastIndex, currentIndex), Math.max(lastIndex, currentIndex)];
      for (let i = start; i <= end; i++) newSelected.add(filteredMedia[i].id);
    } else {
      if (newSelected.has(id)) newSelected.delete(id);
      else newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setLastSelectedId(id);
  };

  const selectAll = () => setSelectedIds(new Set(filteredMedia.map(v => v.id)));
  const clearSelection = () => { setSelectedIds(new Set()); setLastSelectedId(null); };
  const allSelected = filteredMedia.length > 0 && filteredMedia.every(v => selectedIds.has(v.id));
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
        if (result.skipped) {
          setError(result.error || 'Video requires face blur before AI processing');
        } else {
        throw new Error(result.error || 'Analysis did not complete');
        }
        return;
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
        const nextPending = filteredMedia.findIndex((v, i) => i > selectedVideoIndex && v.aiStatus === 'completed' && v.trainingStatus === 'pending');
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
        if (filteredMedia.length <= 1) setSelectedVideoIndex(null);
        else if (selectedVideoIndex >= filteredMedia.length - 1) setSelectedVideoIndex(selectedVideoIndex - 1);
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
    if (!user || isProcessingBatch) return;
    setIsProcessingBatch(true);
    try {
      setError(null);
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/videos/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'process_batch', batchSize: 5 }),
      });
      const result = await response.json();
      if (result.skipped > 0) {
        setError(`Processed ${result.processed} videos. Skipped ${result.skipped} (blur pending).`);
      } else if (result.processed > 0) {
        setError(null); // Clear any previous errors
      }
      await fetchMedia();
    } catch (err: any) { setError(err.message); }
    finally { setIsProcessingBatch(false); }
  };

  // Blur handlers
  const handleApplyBlur = async (videoId: string) => {
    if (!user) return;
    setBlurringIds(prev => new Set(prev).add(videoId));
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/contributions/blur', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ mediaId: videoId, action: 'blur' }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error || 'Blur failed');
      }
      await fetchMedia();
    } catch (err: any) {
      setError(err.message || 'Blur error');
    } finally {
      setBlurringIds(prev => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }
  };

  const handleApproveBlur = async (videoId: string) => {
    if (!user) return;
    setProcessingIds(prev => new Set(prev).add(videoId));
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/videos/${videoId}/review`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reviewStatus: 'approved' }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Approval failed');
      }
      await fetchMedia();
    } catch (err: any) {
      setError(err.message || 'Approval error');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }
  };

  const handleRejectBlur = async (videoId: string) => {
    if (!user) return;
    setProcessingIds(prev => new Set(prev).add(videoId));
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/videos/${videoId}/review`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reviewStatus: 'rejected' }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Rejection failed');
      }
      await fetchMedia();
    } catch (err: any) {
      setError(err.message || 'Rejection error');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }
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
  const formatTotalDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };
  
  // Get processing status with unified pipeline logic
  const getProcessingStatus = (video: VideoItem): { label: string; variant: 'warning' | 'info' | 'processing' | 'success' | 'error'; icon: JSX.Element } => {
    // Only videos that explicitly have reviewStatus field AND it's not approved
    const needsBlur = typeof video.reviewStatus === 'string' && video.reviewStatus !== 'approved';
    
    // Check blur first
    if (needsBlur) {
      return { 
        label: 'Blur Pending', 
        variant: 'warning',
        icon: <Clock className="w-4 h-4" />
      };
    }
    
    // Then check AI status
    if (video.aiStatus === 'failed') {
      return { 
        label: 'Failed', 
        variant: 'error',
        icon: <XCircle className="w-4 h-4" />
      };
    }
    if (video.aiStatus === 'processing') {
      return { 
        label: 'Processing', 
        variant: 'processing',
        icon: <RefreshCw className="w-4 h-4 animate-spin" />
      };
    }
    if (video.aiStatus === 'completed') {
      return { 
        label: 'Ready', 
        variant: 'success',
        icon: <CheckCircle className="w-4 h-4" />
      };
    }
    
    // Default: needs CV labeling
    return { 
      label: 'Labels Pending', 
      variant: 'info',
      icon: <Tag className="w-4 h-4" />
    };
  };
  
  const getProcessingStatusBadge = (video: VideoItem) => {
    const status = getProcessingStatus(video);
    const variantClasses = {
      warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      info: 'bg-blue-100 text-blue-700 border-blue-200',
      processing: 'bg-blue-100 text-blue-700 border-blue-200',
      success: 'bg-green-100 text-green-700 border-green-200',
      error: 'bg-red-100 text-red-700 border-red-200',
    };
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${variantClasses[status.variant]}`}>
        {status.icon}
        {status.label}
      </span>
    );
  };
  
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

  const selectedVideo = selectedVideoIndex !== null ? filteredMedia[selectedVideoIndex] : null;

  // Helper functions
  const extractVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(Math.round(video.duration));
      };
      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(file);
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Handle admin import
  const handleImport = async () => {
    if (!user || importFiles.length === 0) return;
    
    setImportUploading(true);
    const progressMap = new Map<string, number>();
    
    try {
      for (const file of importFiles) {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `contributions/${user.uid}/${timestamp}_${safeName}`;
        const storageRef = ref(storage, storagePath);
        
        // Upload with progress tracking
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              progressMap.set(file.name, progress);
              setImportProgress(new Map(progressMap));
            },
            reject,
            async () => {
              try {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                
                // Extract duration if video
                let durationSeconds = 0;
                if (file.type.startsWith('video/')) {
                  durationSeconds = await extractVideoDuration(file);
                }
                
                // Create media document - AUTO APPROVED
                await addDoc(collection(db, 'media'), {
                  contributorId: user.uid,
                  contributorEmail: user.email || 'admin@supervolcano.ai',
                  contributorName: importAttribution.trim() || 'Admin Import',
                  fileName: file.name,
                  fileSize: file.size,
                  mimeType: file.type,
                  url,
                  storagePath,
                  durationSeconds,
                  locationText: null,
                  source: 'web_contribute',
                  reviewStatus: 'approved', // Auto-approve for admin
                  reviewedAt: serverTimestamp(),
                  reviewedBy: user.uid,
                  blurStatus: 'none',
                  blurredUrl: null,
                  blurredStoragePath: null,
                  facesDetected: null,
                  blurError: null,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
                
                resolve();
              } catch (err) {
                reject(err);
              }
            }
          );
        });
      }
      
      // Success - close modal and reset
      setShowImportModal(false);
      setImportFiles([]);
      setImportAttribution('');
      setImportProgress(new Map());
      fetchMedia(); // Refresh the list
    } catch (error) {
      console.error('Import error:', error);
      alert('Import failed. Check console for details.');
    } finally {
      setImportUploading(false);
    }
  };

  // Handle file drop/select
  const handleImportFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImportFiles(Array.from(e.target.files));
    }
  };

  const handleImportDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => 
      f.type.startsWith('video/')
    );
    setImportFiles(files);
  };

  // Google Drive handlers
  const handleDriveConnect = async () => {
    if (!user) return;
    
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/drive/auth?action=getAuthUrl', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { authUrl } = await response.json();
      
      // Open OAuth popup
      const popup = window.open(authUrl, 'Google Drive Auth', 'width=500,height=600');
      
      // Listen for OAuth callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'google-oauth-callback' && event.data?.code) {
          window.removeEventListener('message', handleMessage);
          popup?.close();
          
          // Exchange code for token
          const tokenResponse = await fetch('/api/admin/drive/auth', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify({ code: event.data.code }),
          });
          
          const tokenData = await tokenResponse.json();
          if (tokenData.success) {
            sessionStorage.setItem('driveAccessToken', tokenData.accessToken);
            setDriveAccessToken(tokenData.accessToken);
            setDriveConnected(true);
          } else {
            alert('Failed to connect: ' + tokenData.error);
          }
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Fallback: check URL params if popup closes
      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup);
          window.removeEventListener('message', handleMessage);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Drive connect error:', error);
    }
  };

  const handleDriveListFiles = async () => {
    const token = driveAccessToken || sessionStorage.getItem('driveAccessToken');
    if (!user || !token || !driveFolderUrl) return;
    
    setDriveLoading(true);
    try {
      const userToken = await user.getIdToken();
      const response = await fetch('/api/admin/drive/list', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}` 
        },
        body: JSON.stringify({ 
          accessToken: token, 
          folderUrl: driveFolderUrl 
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setDriveFolderName(data.folderName);
        setDriveFiles(data.files.map((f: any) => ({ ...f, selected: true })));
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Drive list error:', error);
    } finally {
      setDriveLoading(false);
    }
  };

  const handleDriveImport = async () => {
    const token = driveAccessToken || sessionStorage.getItem('driveAccessToken');
    if (!user || !token || driveFiles.length === 0) return;
    
    const selectedFiles = driveFiles.filter(f => f.selected);
    if (selectedFiles.length === 0) {
      alert('No files selected');
      return;
    }
    
    setDriveImporting(true);
    setDriveImportProgress(0);
    
    try {
      const userToken = await user.getIdToken();
      const response = await fetch('/api/admin/drive/import', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}` 
        },
        body: JSON.stringify({ 
          accessToken: token,
          files: selectedFiles.map(f => ({ id: f.id, name: f.name, size: f.size, mimeType: f.mimeType })),
          attribution: driveAttribution.trim() || 'Google Drive Import',
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`Imported ${data.successCount} of ${selectedFiles.length} videos`);
        // Clear token after successful import
        sessionStorage.removeItem('driveAccessToken');
        setDriveAccessToken(null);
        setDriveConnected(false);
        setShowDriveModal(false);
        setDriveFiles([]);
        setDriveFolderUrl('');
        setDriveFolderName('');
        setDriveAttribution('');
        fetchMedia(); // Refresh the list
      } else {
        alert('Import failed: ' + data.error);
      }
    } catch (error) {
      console.error('Drive import error:', error);
      alert('Import failed');
    } finally {
      setDriveImporting(false);
    }
  };

  const toggleDriveFileSelect = (fileId: string) => {
    setDriveFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, selected: !f.selected } : f
    ));
  };

  const toggleAllDriveFiles = () => {
    const allSelected = driveFiles.every(f => f.selected);
    setDriveFiles(prev => prev.map(f => ({ ...f, selected: !allSelected })));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
          <p className="text-gray-500 mt-1">Manage and process video content for AI analysis</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Secondary actions - subtle styling */}
          <div className="flex items-center">
            {/* Import dropdown - outline style */}
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowImportDropdown(!showImportDropdown); }}
                className="px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium"
              >
                <Upload className="w-4 h-4" />
                Import
                <ChevronDown className="w-3 h-3" />
          </button>
              
              {showImportDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                  <button
                    onClick={() => { setShowImportModal(true); setShowImportDropdown(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 rounded-t-lg"
                  >
                    <Upload className="w-4 h-4 text-gray-500" />
                    From Device
                  </button>
                  <button
                    onClick={() => { setShowDriveModal(true); setShowImportDropdown(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 rounded-b-lg"
                  >
                    <HardDrive className="w-4 h-4 text-gray-500" />
                    From Google Drive
          </button>
        </div>
              )}
      </div>

            {/* Refresh - icon button, matches import height */}
            <button 
              onClick={fetchMedia} 
              disabled={loading} 
              className="ml-2 p-2 text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
      </div>

          {/* Primary action - stands out */}
          {activeTab === 'overview' && (
            <button 
              onClick={processBatch} 
              disabled={isProcessingBatch}
              className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
            >
              <Play className="w-4 h-4" />
              Process Batch
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      {(() => {
        // Calculate tab counts
        const blurPendingCount = media.filter(v => {
          // No blur status or not complete = needs blur
          if (!v.blurStatus || v.blurStatus === 'none') return true;
          // Has reviewStatus that's not approved = needs review
          if (typeof v.reviewStatus === 'string' && v.reviewStatus !== 'approved') return true;
          return false;
        }).length;
        const labelsPendingCount = media.filter(v => v.aiStatus === 'pending' || !v.aiStatus).length;
        const exportReadyCount = media.filter(v => v.reviewStatus === 'approved').length;

        const tabs = [
          { id: 'overview', label: 'Overview' },
          { id: 'blur', label: 'Blur Review', count: blurPendingCount },
          { id: 'labels', label: 'Label Review', count: labelsPendingCount },
          { id: 'export', label: 'Export', count: exportReadyCount },
        ];

        return <TabNav tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveTab(id as 'overview' | 'blur' | 'labels' | 'export')} />;
      })()}

      {/* Error Display */}
      {error && (
        <div className={`mb-4 p-4 border rounded-lg ${
          error.includes('Skipped') || error.includes('blur pending') 
            ? 'bg-yellow-50 border-yellow-200 text-yellow-700' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {error}
      </div>
      )}

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          media={media}
          filteredMedia={filteredMedia}
          stats={stats}
          totalCount={totalCount}
          filter={filter}
          setFilter={setFilter}
          trainingFilter={trainingFilter}
          setTrainingFilter={setTrainingFilter}
          formatTotalDuration={formatTotalDuration}
          loading={loading}
          error={error}
          selectedIds={selectedIds}
          allSelected={allSelected}
          someSelected={someSelected}
          selectAll={selectAll}
          clearSelection={clearSelection}
          toggleSelection={toggleSelection}
          setSelectedVideoIndex={setSelectedVideoIndex}
          formatDuration={formatDuration}
          formatSize={formatSize}
          formatDate={formatDate}
          getProcessingStatusBadge={getProcessingStatusBadge}
          getTrainingBadge={getTrainingBadge}
        />
      )}
      {activeTab === 'blur' && (
        <BlurReviewTab 
          media={media}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelection}
          onSelectAll={(ids) => setSelectedIds(new Set(ids))}
          onApplyBlur={handleApplyBlur}
          onApproveBlur={handleApproveBlur}
          onRejectBlur={handleRejectBlur}
          blurringIds={blurringIds}
          processingIds={processingIds}
          formatDate={formatDate}
          onVideoClick={(video) => {
            const index = filteredMedia.findIndex(v => v.id === video.id);
            setSelectedVideoIndex(index !== -1 ? index : null);
          }}
        />
      )}
      {activeTab === 'labels' && (
        <LabelReviewTab 
          media={media}
          onProcessBatch={processBatch}
          processing={isProcessingBatch}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelection}
          onSelectAll={() => {
            const needsLabels = media.filter(v => v.aiStatus === 'pending' || !v.aiStatus);
            setSelectedIds(new Set(needsLabels.map(v => v.id)));
          }}
          formatDuration={formatDuration}
          formatDate={formatDate}
          onVideoClick={(video) => {
            const index = filteredMedia.findIndex(v => v.id === video.id);
            setSelectedVideoIndex(index !== -1 ? index : null);
          }}
        />
      )}
      {activeTab === 'export' && (
        <ExportTab 
          media={media}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelection}
          onSelectAll={(ids) => setSelectedIds(new Set(ids))}
          formatDuration={formatDuration}
          formatDate={formatDate}
        />
      )}


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
                <span className="text-sm text-gray-500">{(selectedVideoIndex ?? 0) + 1} of {filteredMedia.length}</span>
                <button onClick={() => navigateModal(1)} disabled={selectedVideoIndex === filteredMedia.length - 1} className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30" title="Next"><ChevronRight className="w-5 h-5" /></button>
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

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Import Videos</h3>
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setImportFiles([]);
                  setImportProgress(new Map());
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600">
              Import videos directly as admin. Videos will be auto-approved and ready for face blurring.
            </p>
            
            {/* Drop zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleImportDrop}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition cursor-pointer"
              onClick={() => document.getElementById('import-file-input')?.click()}
            >
              <input
                id="import-file-input"
                type="file"
                multiple
                accept="video/*"
                onChange={handleImportFiles}
                className="hidden"
              />
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              {importFiles.length === 0 ? (
                <>
                  <p className="text-gray-600 font-medium">Drop videos here or click to select</p>
                  <p className="text-sm text-gray-400 mt-1">MP4, MOV, WebM supported</p>
                </>
              ) : (
                <p className="text-blue-600 font-medium">{importFiles.length} video(s) selected</p>
              )}
            </div>
            
            {/* Selected files list */}
            {importFiles.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-2">
                {importFiles.map((file, i) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <span className="truncate flex-1">{file.name}</span>
                    <span className="text-gray-400 ml-2">{formatFileSize(file.size)}</span>
                    {importProgress.get(file.name) !== undefined && (
                      <span className="text-blue-600 ml-2">{Math.round(importProgress.get(file.name) || 0)}%</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Attribution */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Attribution <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={importAttribution}
                onChange={(e) => setImportAttribution(e.target.value)}
                placeholder="Contributor name or leave blank for 'Admin Import'"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFiles([]);
                  setImportProgress(new Map());
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importUploading || importFiles.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {importUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import {importFiles.length > 0 ? importFiles.length : ''} Video{importFiles.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Import Modal */}
      {showDriveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <HardDrive className="w-5 h-5" />
                  Import from Google Drive
                </h3>
                <button 
                  onClick={() => {
                    setShowDriveModal(false);
                    setDriveFiles([]);
                    setDriveFolderUrl('');
                    setDriveFolderName('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Step 1: Connect */}
              {!driveConnected ? (
                <div className="text-center py-8">
                  <HardDrive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Connect your Google account to import videos from Drive</p>
                  <button
                    onClick={handleDriveConnect}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Connect Google Drive
                  </button>
                </div>
              ) : (
                <>
                  {/* Step 2: Paste folder URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Google Drive Folder URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={driveFolderUrl}
                        onChange={(e) => setDriveFolderUrl(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/..."
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleDriveListFiles}
                        disabled={driveLoading || !driveFolderUrl}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {driveLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                        List Files
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Make sure the folder is shared with your Google account
                    </p>
                  </div>

                  {/* Step 3: Select files */}
                  {driveFiles.length > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-900">{driveFolderName}</span>
                          <span className="text-gray-500 ml-2">({driveFiles.length} videos)</span>
                        </div>
                        <button
                          onClick={toggleAllDriveFiles}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {driveFiles.every(f => f.selected) ? 'Deselect all' : 'Select all'}
                        </button>
                      </div>
                      <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                        {driveFiles.map(file => (
                          <div 
                            key={file.id}
                            className={`flex items-center gap-3 p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer ${file.selected ? 'bg-blue-50' : ''}`}
                            onClick={() => toggleDriveFileSelect(file.id)}
                          >
                            <button className="text-gray-400">
                              {file.selected ? (
                                <CheckSquare className="w-5 h-5 text-blue-600" />
                              ) : (
                                <Square className="w-5 h-5" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                              <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Attribution */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Attribution <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={driveAttribution}
                          onChange={(e) => setDriveAttribution(e.target.value)}
                          placeholder="Contributor name or leave blank for 'Google Drive Import'"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            {/* Footer */}
            {driveConnected && driveFiles.length > 0 && (
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {driveFiles.filter(f => f.selected).length} of {driveFiles.length} selected
                  </span>
                  <button
                    onClick={handleDriveImport}
                    disabled={driveImporting || driveFiles.filter(f => f.selected).length === 0}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {driveImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Import Selected
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
