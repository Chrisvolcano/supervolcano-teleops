'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  increment,
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { 
  Upload, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  X,
  FileVideo,
  MapPin,
  AlertCircle,
  PlayCircle
} from 'lucide-react';

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

interface MediaItem {
  id: string;
  fileName: string;
  fileSize: number;
  url: string;
  locationText?: string;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: any;
  durationSeconds?: number;
}

interface UserStats {
  totalUploads: number;
  totalDurationSeconds: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

// Extract video duration from file (client-side)
const extractVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(Math.round(video.duration));
    };
    
    video.onerror = () => {
      resolve(0); // Fallback if extraction fails
    };
    
    video.src = URL.createObjectURL(file);
  });
};

export default function ContributorDashboard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState<UserStats>({
    totalUploads: 0,
    totalDurationSeconds: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0
  });
  
  // Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [locationText, setLocationText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Media history
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);

  // Auth check and redirect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push('/contribute');
        return;
      }
      
      const userDoc = await getDoc(doc(db, 'users', u.uid));
      if (!userDoc.exists() || userDoc.data()?.role !== 'contributor') {
        router.push('/contribute');
        return;
      }
      
      setUser(u);
      setUserName(userDoc.data()?.name || 'Contributor');
      setStats(userDoc.data()?.stats || {
        totalUploads: 0,
        totalDurationSeconds: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0
      });
    });
    return () => unsubscribe();
  }, [router]);

  // Subscribe to user's media
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'media'),
      where('contributorId', '==', user.uid),
      where('source', '==', 'web_contribute'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: MediaItem[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MediaItem[];
      setMediaItems(items);
      setLoadingMedia(false);
      
      // Recalculate stats from actual data
      const pending = items.filter(i => i.reviewStatus === 'pending').length;
      const approved = items.filter(i => i.reviewStatus === 'approved').length;
      const rejected = items.filter(i => i.reviewStatus === 'rejected').length;
      
      setStats(prev => ({
        ...prev,
        totalUploads: items.length,
        pendingCount: pending,
        approvedCount: approved,
        rejectedCount: rejected
      }));
    }, (error) => {
      console.error('Error fetching media:', error);
      setLoadingMedia(false);
    });

    return () => unsubscribe();
  }, [user]);

  // File handling
  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const videoFiles = Array.from(newFiles).filter(f => 
      f.type.startsWith('video/') || 
      /\.(mp4|mov|avi|mkv|m4v|webm)$/i.test(f.name)
    );

    if (videoFiles.length === 0) return;

    const uploadFiles: UploadFile[] = videoFiles.map(file => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      progress: 0,
      status: 'pending'
    }));

    setFiles(prev => [...prev, ...uploadFiles]);
    setShowUploadModal(true);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = ''; // Reset for re-selection
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadAllFiles = async () => {
    if (!user || files.length === 0) return;
    
    setIsUploading(true);
    const pendingFiles = files.filter(f => f.status === 'pending');

    for (const uploadFile of pendingFiles) {
      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'uploading' } : f
      ));

      try {
        const timestamp = Date.now();
        const safeName = uploadFile.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `contributions/${user.uid}/${timestamp}_${safeName}`;
        const storageRef = ref(storage, storagePath);

        await new Promise<void>((resolve, reject) => {
          const uploadTask = uploadBytesResumable(storageRef, uploadFile.file, {
            contentType: uploadFile.file.type,
            customMetadata: {
              contributorId: user.uid,
              originalName: uploadFile.file.name,
              source: 'web_contribute'
            }
          });

          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setFiles(prev => prev.map(f => 
                f.id === uploadFile.id ? { ...f, progress } : f
              ));
            },
            (error) => {
              console.error('Upload error:', error);
              setFiles(prev => prev.map(f => 
                f.id === uploadFile.id ? { ...f, status: 'error', error: error.message } : f
              ));
              reject(error);
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

                // Extract duration before creating media document
                const durationSeconds = await extractVideoDuration(uploadFile.file);

                // Create media document
                await addDoc(collection(db, 'media'), {
                  contributorId: user.uid,
                  contributorEmail: user.email,
                  contributorName: userName,
                  fileName: uploadFile.file.name,
                  fileSize: uploadFile.file.size,
                  mimeType: uploadFile.file.type,
                  durationSeconds,
                  url: downloadURL,
                  storagePath,
                  locationText: locationText.trim() || null,
                  source: 'web_contribute',
                  reviewStatus: 'pending',
                  reviewedAt: null,
                  reviewedBy: null,
                  rejectionReason: null,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                });

                // Update user stats
                await updateDoc(doc(db, 'users', user.uid), {
                  'stats.totalUploads': increment(1),
                  'stats.pendingCount': increment(1),
                  'stats.totalDurationSeconds': increment(durationSeconds)
                });

                setFiles(prev => prev.map(f => 
                  f.id === uploadFile.id ? { ...f, status: 'complete', progress: 100 } : f
                ));
                resolve();
              } catch (error: any) {
                setFiles(prev => prev.map(f => 
                  f.id === uploadFile.id ? { ...f, status: 'error', error: error.message } : f
                ));
                reject(error);
              }
            }
          );
        });
      } catch (error) {
        // Error already handled in the promise
        continue;
      }
    }

    setIsUploading(false);
  };

  const closeModal = () => {
    if (isUploading) return;
    setShowUploadModal(false);
    setFiles([]);
    setLocationText('');
  };

  const completedCount = files.filter(f => f.status === 'complete').length;
  const allComplete = files.length > 0 && completedCount === files.length;
  const hasErrors = files.some(f => f.status === 'error');
  const hasPending = files.some(f => f.status === 'pending');

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {userName}</h1>
        <p className="text-gray-600">Upload footage and track your contributions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUploads}</p>
              <p className="text-xs text-gray-500">Total Uploads</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingCount}</p>
              <p className="text-xs text-gray-500">Pending Review</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.approvedCount}</p>
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
              <p className="text-2xl font-bold text-gray-900">{stats.rejectedCount}</p>
              <p className="text-xs text-gray-500">Rejected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
          isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
        <p className="text-lg font-medium text-gray-700 mb-1">
          Drag & drop videos here
        </p>
        <p className="text-sm text-gray-500 mb-4">
          or click to browse from your SD card
        </p>
        <p className="text-xs text-gray-400">
          MP4, MOV, AVI, MKV supported • No file size limit
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,.mp4,.mov,.avi,.mkv,.m4v,.webm"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Upload History */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload History</h2>
        
        {loadingMedia ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : mediaItems.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <FileVideo className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No uploads yet</p>
            <p className="text-sm text-gray-400">Your uploaded videos will appear here</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">File</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 hidden sm:table-cell">Location</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Date</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {mediaItems.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <a 
                            href={item.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-blue-600 transition"
                          >
                            <PlayCircle className="w-8 h-8" />
                          </a>
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
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-sm text-gray-600">
                          {item.locationText || <span className="text-gray-400">—</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-gray-600">
                          {formatDate(item.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.reviewStatus === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                        {item.reviewStatus === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            <CheckCircle className="w-3 h-3" />
                            Approved
                          </span>
                        )}
                        {item.reviewStatus === 'rejected' && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                              <XCircle className="w-3 h-3" />
                              Rejected
                            </span>
                            {item.rejectionReason && (
                              <p className="text-xs text-red-500 mt-1">{item.rejectionReason}</p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Upload Videos</h3>
              {!isUploading && (
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Optional Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    disabled={isUploading}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-50"
                    placeholder="e.g., 123 Main St, Apt 4B"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Apply same location to all files in this batch
                </p>
              </div>

              {/* File List */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    {files.length} file{files.length !== 1 ? 's' : ''} selected
                  </span>
                  <span className="text-sm text-gray-500">
                    {completedCount} / {files.length} uploaded
                  </span>
                </div>

                {files.map(file => (
                  <div key={file.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <FileVideo className="w-6 h-6 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.file.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatFileSize(file.file.size)}
                        </p>
                      </div>
                      {file.status === 'pending' && !isUploading && (
                        <button 
                          onClick={() => removeFile(file.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      {file.status === 'uploading' && (
                        <span className="text-sm text-blue-600 font-medium">
                          {Math.round(file.progress)}%
                        </span>
                      )}
                      {file.status === 'complete' && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {file.status === 'error' && (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    {file.status === 'uploading' && (
                      <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}
                    {file.status === 'error' && (
                      <p className="text-xs text-red-500 mt-1">{file.error}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Add more files */}
              {!isUploading && !allComplete && (
                <label className="block">
                  <span className="inline-flex items-center gap-2 text-sm text-blue-600 cursor-pointer hover:underline">
                    <Upload className="w-4 h-4" />
                    Add more files
                  </span>
                  <input
                    type="file"
                    accept="video/*,.mp4,.mov,.avi,.mkv,.m4v,.webm"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t bg-gray-50">
              {allComplete ? (
                <button
                  onClick={closeModal}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  Done
                </button>
              ) : (
                <button
                  onClick={uploadAllFiles}
                  disabled={isUploading || !hasPending}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </span>
                  ) : hasErrors && !hasPending ? (
                    'Close'
                  ) : (
                    `Upload ${files.filter(f => f.status === 'pending').length} File${files.filter(f => f.status === 'pending').length !== 1 ? 's' : ''}`
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

