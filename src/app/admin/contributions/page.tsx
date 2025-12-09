'use client';

import { useState, useEffect, useMemo } from 'react';
import { db, storage } from '@/lib/firebaseClient';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  increment,
  getDocs,
  addDoc
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  PlayCircle,
  User,
  MapPin,
  Calendar,
  X,
  Download,
  Grid,
  List,
  Timer,
  Users,
  Video,
  Search,
  CheckSquare,
  Square,
  Shield,
  Package,
  AlertTriangle,
  FileDown,
  Archive,
  Upload,
  Plus,
  HardDrive,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type ReviewStatus = 'all' | 'pending' | 'approved' | 'rejected';
type ViewMode = 'table' | 'gallery';
type BlurStatus = 'none' | 'processing' | 'complete' | 'failed';
type DeliveryMethod = 'manifest' | 'zip' | 'both';

interface ContributorMedia {
  id: string;
  contributorId: string;
  contributorEmail: string;
  contributorName?: string;
  fileName: string;
  fileSize: number;
  durationSeconds?: number;
  url: string;
  storagePath: string;
  locationText?: string;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedAt?: any;
  reviewedBy?: string;
  createdAt: any;
  // Blur fields
  blurStatus?: BlurStatus;
  blurredUrl?: string;
  blurredStoragePath?: string;
  facesDetected?: number;
  blurError?: string;
}

interface ContributorStats {
  id: string;
  name: string;
  email: string;
  totalUploads: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
}

export default function AdminContributions() {
  const { user } = useAuth();
  
  // Data state
  const [mediaItems, setMediaItems] = useState<ContributorMedia[]>([]);
  const [contributors, setContributors] = useState<Map<string, ContributorStats>>(new Map());
  const [loading, setLoading] = useState(true);
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<ReviewStatus>('pending');
  const [contributorFilter, setContributorFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [blurringIds, setBlurringIds] = useState<Set<string>>(new Set());
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  
  // Modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingItem, setRejectingItem] = useState<ContributorMedia | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [previewItem, setPreviewItem] = useState<ContributorMedia | null>(null);
  
  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportName, setExportName] = useState('');
  const [exportDescription, setExportDescription] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('both');
  const [exportLoading, setExportLoading] = useState(false);
  
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

  // Fetch media with filters
  useEffect(() => {
    let q = query(
      collection(db, 'media'),
      where('source', '==', 'web_contribute'),
      orderBy('createdAt', 'desc')
    );

    if (statusFilter !== 'all') {
      q = query(
        collection(db, 'media'),
        where('source', '==', 'web_contribute'),
        where('reviewStatus', '==', statusFilter),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ContributorMedia[];
      setMediaItems(items);
      setLoading(false);
      
      // Build contributor stats from data
      const statsMap = new Map<string, ContributorStats>();
      items.forEach(item => {
        if (!statsMap.has(item.contributorId)) {
          statsMap.set(item.contributorId, {
            id: item.contributorId,
            name: item.contributorName || 'Unknown',
            email: item.contributorEmail,
            totalUploads: 0,
            approvedCount: 0,
            pendingCount: 0,
            rejectedCount: 0
          });
        }
        const stats = statsMap.get(item.contributorId)!;
        stats.totalUploads++;
        if (item.reviewStatus === 'approved') stats.approvedCount++;
        if (item.reviewStatus === 'pending') stats.pendingCount++;
        if (item.reviewStatus === 'rejected') stats.rejectedCount++;
      });
      setContributors(statsMap);
    }, (error) => {
      console.error('Error fetching contributions:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [statusFilter]);

  // Filtered items
  const filteredItems = useMemo(() => {
    let items = mediaItems;
    
    if (contributorFilter !== 'all') {
      items = items.filter(i => i.contributorId === contributorFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(i => 
        i.fileName.toLowerCase().includes(query) ||
        i.contributorEmail.toLowerCase().includes(query) ||
        i.contributorName?.toLowerCase().includes(query) ||
        i.locationText?.toLowerCase().includes(query)
      );
    }
    
    return items;
  }, [mediaItems, contributorFilter, searchQuery]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const all = mediaItems;
    const pending = all.filter(i => i.reviewStatus === 'pending');
    const approved = all.filter(i => i.reviewStatus === 'approved');
    const blurred = all.filter(i => i.blurStatus === 'complete');
    const totalDuration = all.reduce((sum, i) => sum + (i.durationSeconds || 0), 0);
    const approvedDuration = approved.reduce((sum, i) => sum + (i.durationSeconds || 0), 0);
    
    return {
      totalCount: all.length,
      pendingCount: pending.length,
      approvedCount: approved.length,
      rejectedCount: all.filter(i => i.reviewStatus === 'rejected').length,
      blurredCount: blurred.length,
      totalDuration,
      approvedDuration,
      contributorCount: contributors.size
    };
  }, [mediaItems, contributors]);

  // Actions
  const handleApprove = async (item: ContributorMedia) => {
    setProcessingIds(prev => new Set(prev).add(item.id));
    try {
      await updateDoc(doc(db, 'media', item.id), {
        reviewStatus: 'approved',
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const userRef = doc(db, 'users', item.contributorId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        await updateDoc(userRef, {
          'stats.pendingCount': increment(-1),
          'stats.approvedCount': increment(1)
        });
      }
    } catch (error) {
      console.error('Error approving:', error);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleBulkApprove = async () => {
    const itemsToApprove = filteredItems.filter(i => 
      selectedIds.has(i.id) && i.reviewStatus === 'pending'
    );
    
    for (const item of itemsToApprove) {
      await handleApprove(item);
    }
    
    setSelectedIds(new Set());
  };

  const openRejectModal = (item: ContributorMedia) => {
    setRejectingItem(item);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectingItem) return;
    
    setProcessingIds(prev => new Set(prev).add(rejectingItem.id));
    try {
      await updateDoc(doc(db, 'media', rejectingItem.id), {
        reviewStatus: 'rejected',
        rejectionReason: rejectionReason.trim() || null,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const userRef = doc(db, 'users', rejectingItem.contributorId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        await updateDoc(userRef, {
          'stats.pendingCount': increment(-1),
          'stats.rejectedCount': increment(1)
        });
      }

      setShowRejectModal(false);
      setRejectingItem(null);
    } catch (error) {
      console.error('Error rejecting:', error);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(rejectingItem.id);
        return next;
      });
    }
  };

  // Blur handler
  const handleBlur = async (item: ContributorMedia) => {
    if (!user) return;
    setBlurringIds(prev => new Set(prev).add(item.id));
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/contributions/blur', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ mediaId: item.id, action: 'blur' }),
      });
      const result = await response.json();
      if (!result.success) {
        console.error('Blur failed:', result.error);
      }
    } catch (error) {
      console.error('Blur error:', error);
    } finally {
      setBlurringIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  // Download handler
  const handleDownload = async (item: ContributorMedia, type: 'blurred' | 'original') => {
    if (!user) return;
    setDownloadingIds(prev => new Set(prev).add(item.id));
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/admin/contributions/download?mediaId=${item.id}&type=${type}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const result = await response.json();
      if (result.success && result.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setDownloadingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  // Export handler
  const handleCreateExport = async () => {
    if (!exportName.trim() || !user) return;
    
    const eligibleIds = filteredItems
      .filter(i => selectedIds.has(i.id) && i.reviewStatus === 'approved')
      .map(i => i.id);
    
    if (eligibleIds.length === 0) {
      alert('No approved videos selected');
      return;
    }
    
    setExportLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/contributions/export', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name: exportName,
          description: exportDescription,
          videoIds: eligibleIds,
          deliveryMethod,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setShowExportModal(false);
        setExportName('');
        setExportDescription('');
        setSelectedIds(new Set());
        alert(`Export created! ${result.export.videoCount} videos included.`);
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExportLoading(false);
    }
  };

  // Extract video duration helper
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
    if (!user || !driveAccessToken || !driveFolderUrl) return;
    
    setDriveLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/drive/list', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          accessToken: driveAccessToken, 
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
    if (!user || !driveAccessToken || driveFiles.length === 0) return;
    
    const selectedFiles = driveFiles.filter(f => f.selected);
    if (selectedFiles.length === 0) {
      alert('No files selected');
      return;
    }
    
    setDriveImporting(true);
    setDriveImportProgress(0);
    
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/drive/import', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          accessToken: driveAccessToken, 
          files: selectedFiles,
          attribution: driveAttribution,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`Imported ${data.successCount} of ${selectedFiles.length} videos`);
        setShowDriveModal(false);
        setDriveFiles([]);
        setDriveFolderUrl('');
        setDriveFolderName('');
      } else {
        alert('Import failed: ' + data.error);
      }
    } catch (error) {
      console.error('Drive import error:', error);
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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  // Formatters
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTotalDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '—';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const pendingSelectedCount = filteredItems.filter(i => 
    selectedIds.has(i.id) && i.reviewStatus === 'pending'
  ).length;

  const approvedSelectedCount = filteredItems.filter(i => 
    selectedIds.has(i.id) && i.reviewStatus === 'approved'
  ).length;

  // Blur status badge component
  const BlurStatusBadge = ({ item }: { item: ContributorMedia }) => {
    const isBlurring = blurringIds.has(item.id);
    
    if (isBlurring || item.blurStatus === 'processing') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
          <Loader2 className="w-3 h-3 animate-spin" />
          Blurring...
        </span>
      );
    }
    
    if (item.blurStatus === 'complete') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
          <Shield className="w-3 h-3" />
          Blurred ({item.facesDetected || 0})
        </span>
      );
    }
    
    if (item.blurStatus === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-full">
          <AlertTriangle className="w-3 h-3" />
          Failed
        </span>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contributions</h1>
          <p className="text-gray-600">Review and approve uploaded footage</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            <Upload className="w-4 h-4" />
            Import Videos
          </button>
          <button
            onClick={() => setShowDriveModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
          >
            <HardDrive className="w-4 h-4" />
            Import from Drive
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg transition ${viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <List className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('gallery')}
            className={`p-2 rounded-lg transition ${viewMode === 'gallery' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Grid className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summaryStats.pendingCount}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summaryStats.approvedCount}</p>
              <p className="text-xs text-gray-500">Approved</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summaryStats.rejectedCount}</p>
              <p className="text-xs text-gray-500">Rejected</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summaryStats.blurredCount}</p>
              <p className="text-xs text-gray-500">Blurred</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Timer className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatTotalDuration(summaryStats.approvedDuration)}</p>
              <p className="text-xs text-gray-500">Approved Time</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summaryStats.contributorCount}</p>
              <p className="text-xs text-gray-500">Contributors</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Video className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summaryStats.totalCount}</p>
              <p className="text-xs text-gray-500">Total Videos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by filename, contributor, or location..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReviewStatus)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending ({summaryStats.pendingCount})</option>
            <option value="approved">Approved ({summaryStats.approvedCount})</option>
            <option value="rejected">Rejected ({summaryStats.rejectedCount})</option>
          </select>

          {/* Contributor Filter */}
          <select
            value={contributorFilter}
            onChange={(e) => setContributorFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Contributors</option>
            {Array.from(contributors.values()).map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.totalUploads})
              </option>
            ))}
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between flex-wrap gap-3">
            <span className="text-sm text-gray-600">
              {selectedIds.size} selected
              {pendingSelectedCount > 0 && (
                <span className="text-yellow-600 ml-1">({pendingSelectedCount} pending)</span>
              )}
              {approvedSelectedCount > 0 && (
                <span className="text-green-600 ml-1">({approvedSelectedCount} approved)</span>
              )}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
              {pendingSelectedCount > 0 && (
                <button
                  onClick={handleBulkApprove}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve {pendingSelectedCount}
                </button>
              )}
              {approvedSelectedCount > 0 && (
                <button
                  onClick={() => setShowExportModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
                >
                  <Package className="w-4 h-4" />
                  Export {approvedSelectedCount}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No videos found</p>
          <p className="text-sm text-gray-400 mt-1">
            {statusFilter !== 'all' ? `No ${statusFilter} videos` : 'Contributions will appear here'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 w-10">
                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600">
                      {selectedIds.size === filteredItems.length ? (
                        <CheckSquare className="w-5 h-5" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Video</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Duration</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Contributor</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 hidden lg:table-cell">Location</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Uploaded</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map(item => {
                  const isProcessing = processingIds.has(item.id);
                  const isSelected = selectedIds.has(item.id);
                  const contributorStats = contributors.get(item.contributorId);
                  
                  return (
                    <tr key={item.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                      <td className="px-4 py-4">
                        <button 
                          onClick={() => toggleSelect(item.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setPreviewItem(item)}
                            className="relative group flex-shrink-0"
                          >
                            <div className="w-20 h-14 bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden">
                              <PlayCircle className="w-6 h-6 text-white opacity-70 group-hover:opacity-100 transition" />
                            </div>
                          </button>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                              {item.fileName}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatFileSize(item.fileSize)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <Timer className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {formatDuration(item.durationSeconds)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                              {item.contributorName || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {contributorStats ? (
                                <span className="text-green-600">{contributorStats.approvedCount} approved</span>
                              ) : (
                                item.contributorEmail
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        {item.locationText ? (
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate max-w-[150px]">{item.locationText}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {formatDate(item.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          {item.reviewStatus === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full w-fit">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          )}
                          {item.reviewStatus === 'approved' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full w-fit">
                              <CheckCircle className="w-3 h-3" />
                              Approved
                            </span>
                          )}
                          {item.reviewStatus === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full w-fit">
                              <XCircle className="w-3 h-3" />
                              Rejected
                            </span>
                          )}
                          <BlurStatusBadge item={item} />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {/* Pending actions */}
                          {item.reviewStatus === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(item)}
                                disabled={isProcessing}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                              >
                                {isProcessing ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-3 h-3" />
                                )}
                                Approve
                              </button>
                              <button
                                onClick={() => openRejectModal(item)}
                                disabled={isProcessing}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                              >
                                <XCircle className="w-3 h-3" />
                                Reject
                              </button>
                            </>
                          )}
                          
                          {/* Approved actions */}
                          {item.reviewStatus === 'approved' && (
                            <>
                              {/* Blur button */}
                              {(!item.blurStatus || item.blurStatus === 'none' || item.blurStatus === 'failed') && !blurringIds.has(item.id) && (
                                <button
                                  onClick={() => handleBlur(item)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition"
                                >
                                  <Shield className="w-3 h-3" />
                                  {item.blurStatus === 'failed' ? 'Retry Blur' : 'Blur Faces'}
                                </button>
                              )}
                              
                              {item.blurStatus === 'complete' && !blurringIds.has(item.id) && (
                                <button
                                  onClick={() => handleBlur(item)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 rounded-lg transition"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                  Re-blur
                                </button>
                              )}
                              
                              {/* Download dropdown */}
                              <div className="relative group">
                                <button
                                  disabled={downloadingIds.has(item.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                                >
                                  {downloadingIds.has(item.id) ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Download className="w-3 h-3" />
                                  )}
                                  Download
                                </button>
                                <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                  {item.blurStatus === 'complete' && (
                                    <button
                                      onClick={() => handleDownload(item, 'blurred')}
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <Shield className="w-4 h-4 text-purple-600" />
                                      Blurred Version
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDownload(item, 'original')}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <FileDown className="w-4 h-4 text-gray-600" />
                                    Original
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                          
                          <button
                            onClick={() => setPreviewItem(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                          >
                            <PlayCircle className="w-3 h-3" />
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Gallery View */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map(item => {
            const isProcessing = processingIds.has(item.id);
            const isSelected = selectedIds.has(item.id);
            
            return (
              <div 
                key={item.id} 
                className={`bg-white rounded-xl border overflow-hidden transition ${
                  isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Video Preview */}
                <div 
                  className="relative aspect-video bg-gray-900 cursor-pointer group"
                  onClick={() => setPreviewItem(item)}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <PlayCircle className="w-12 h-12 text-white opacity-70 group-hover:opacity-100 transition" />
                  </div>
                  
                  {/* Duration badge */}
                  {item.durationSeconds && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                      {formatDuration(item.durationSeconds)}
                    </div>
                  )}
                  
                  {/* Status badge */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {item.reviewStatus === 'pending' && (
                      <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">Pending</span>
                    )}
                    {item.reviewStatus === 'approved' && (
                      <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">Approved</span>
                    )}
                    {item.reviewStatus === 'rejected' && (
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">Rejected</span>
                    )}
                    {item.blurStatus === 'complete' && (
                      <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Blurred
                      </span>
                    )}
                  </div>
                  
                  {/* Selection checkbox */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                    className="absolute top-2 right-2 text-white"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5 opacity-50 hover:opacity-100" />
                    )}
                  </button>
                </div>
                
                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.fileName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.contributorName || item.contributorEmail}
                  </p>
                  {item.locationText && (
                    <p className="text-xs text-gray-400 mt-1 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {item.locationText}
                    </p>
                  )}
                  
                  {/* Actions */}
                  {item.reviewStatus === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleApprove(item)}
                        disabled={isProcessing}
                        className="flex-1 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => openRejectModal(item)}
                        disabled={isProcessing}
                        className="flex-1 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  
                  {item.reviewStatus === 'approved' && (!item.blurStatus || item.blurStatus === 'none') && (
                    <button
                      onClick={() => handleBlur(item)}
                      disabled={blurringIds.has(item.id)}
                      className="w-full mt-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <Shield className="w-3 h-3" />
                      Blur Faces
                    </button>
                  )}
                  
                  {item.reviewStatus === 'approved' && item.blurStatus === 'complete' && !blurringIds.has(item.id) && (
                    <button
                      onClick={() => handleBlur(item)}
                      className="w-full mt-3 py-1.5 text-orange-600 hover:bg-orange-50 text-xs font-medium rounded-lg transition flex items-center justify-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Re-blur
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && rejectingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Reject Video</h3>
              <button 
                onClick={() => setShowRejectModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600">
              Rejecting <span className="font-medium">{rejectingItem.fileName}</span>
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="e.g., Video too dark, audio missing, wrong location..."
              />
              <p className="text-xs text-gray-400 mt-1">
                The contributor will see this reason
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processingIds.has(rejectingItem.id)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {processingIds.has(rejectingItem.id) ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Rejecting...
                  </span>
                ) : (
                  'Reject Video'
                )}
              </button>
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
              {contributors.size > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Or select existing:</p>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(contributors.values()).slice(0, 5).map(c => (
                      <button
                        key={c.id}
                        onClick={() => setImportAttribution(c.name)}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Create Export</h3>
              <button 
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600">
              Export <span className="font-medium">{approvedSelectedCount}</span> approved videos for partner delivery.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Export Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={exportName}
                onChange={(e) => setExportName(e.target.value)}
                placeholder="e.g., December 2024 Training Data"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={exportDescription}
                onChange={(e) => setExportDescription(e.target.value)}
                rows={2}
                placeholder="Notes about this export..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Method
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="delivery" 
                    value="manifest"
                    checked={deliveryMethod === 'manifest'}
                    onChange={() => setDeliveryMethod('manifest')}
                    className="text-indigo-600"
                  />
                  <span className="text-sm">Manifest only (signed URLs)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="delivery" 
                    value="zip"
                    checked={deliveryMethod === 'zip'}
                    onChange={() => setDeliveryMethod('zip')}
                    className="text-indigo-600"
                  />
                  <span className="text-sm">ZIP file only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="delivery" 
                    value="both"
                    checked={deliveryMethod === 'both'}
                    onChange={() => setDeliveryMethod('both')}
                    className="text-indigo-600"
                  />
                  <span className="text-sm">Both manifest and ZIP</span>
                </label>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              <p className="font-medium flex items-center gap-1">
                <Shield className="w-4 h-4" />
                Privacy Note
              </p>
              <p className="mt-1">Blurred versions will be used when available. Videos without blur will use original.</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateExport}
                disabled={exportLoading || !exportName.trim()}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {exportLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4" />
                    Create Export
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {previewItem && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewItem(null)}
        >
          <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <button 
              className="absolute -top-12 right-0 text-white/70 hover:text-white"
              onClick={() => setPreviewItem(null)}
            >
              <X className="w-8 h-8" />
            </button>
            
            <video
              src={previewItem.blurStatus === 'complete' && previewItem.blurredUrl ? previewItem.blurredUrl : previewItem.url}
              controls
              autoPlay
              className="w-full max-h-[60vh] object-contain rounded-lg bg-black"
            />
            
            {/* Video Details */}
            <div className="mt-4 bg-white/10 backdrop-blur rounded-lg p-4 text-white">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-sm opacity-60">File</p>
                  <p className="font-medium">{previewItem.fileName}</p>
                </div>
                <div>
                  <p className="text-sm opacity-60">Duration</p>
                  <p className="font-medium">{formatDuration(previewItem.durationSeconds)}</p>
                </div>
                <div>
                  <p className="text-sm opacity-60">Size</p>
                  <p className="font-medium">{formatFileSize(previewItem.fileSize)}</p>
                </div>
                <div>
                  <p className="text-sm opacity-60">Contributor</p>
                  <p className="font-medium">{previewItem.contributorName || previewItem.contributorEmail}</p>
                </div>
                {previewItem.locationText && (
                  <div>
                    <p className="text-sm opacity-60">Location</p>
                    <p className="font-medium">{previewItem.locationText}</p>
                  </div>
                )}
                {previewItem.blurStatus === 'complete' && (
                  <div>
                    <p className="text-sm opacity-60">Blur Status</p>
                    <p className="font-medium flex items-center gap-1">
                      <Shield className="w-4 h-4 text-purple-400" />
                      {previewItem.facesDetected || 0} faces blurred
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm opacity-60">Uploaded</p>
                  <p className="font-medium">{formatDate(previewItem.createdAt)}</p>
                </div>
              </div>
              
              {/* Actions in preview */}
              <div className="flex gap-3 mt-4 pt-4 border-t border-white/20 flex-wrap">
                {previewItem.reviewStatus === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        handleApprove(previewItem);
                        setPreviewItem(null);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setPreviewItem(null);
                        openRejectModal(previewItem);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 text-white font-medium rounded-lg hover:bg-white/30 transition"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </>
                )}
                
                {previewItem.reviewStatus === 'approved' && (
                  <>
                    {(!previewItem.blurStatus || previewItem.blurStatus === 'none') && (
                      <button
                        onClick={() => handleBlur(previewItem)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition"
                      >
                        <Shield className="w-4 h-4" />
                        Blur Faces
                      </button>
                    )}
                    
                    {previewItem.blurStatus === 'complete' && (
                      <>
                        <button
                          onClick={() => handleBlur(previewItem)}
                          className="inline-flex items-center gap-2 px-4 py-2 text-orange-400 hover:bg-white/20 font-medium rounded-lg transition"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Re-blur
                        </button>
                        <button
                          onClick={() => handleDownload(previewItem, 'blurred')}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition"
                        >
                          <Download className="w-4 h-4" />
                          Download Blurred
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={() => handleDownload(previewItem, 'original')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 text-white font-medium rounded-lg hover:bg-white/30 transition"
                    >
                      <Download className="w-4 h-4" />
                      Download Original
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
