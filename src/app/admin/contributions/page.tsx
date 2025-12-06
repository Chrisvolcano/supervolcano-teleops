'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebaseClient';
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
  increment
} from 'firebase/firestore';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  PlayCircle,
  User,
  MapPin,
  Calendar,
  Filter,
  X
} from 'lucide-react';

type ReviewStatus = 'all' | 'pending' | 'approved' | 'rejected';

interface ContributorMedia {
  id: string;
  contributorId: string;
  contributorEmail: string;
  contributorName?: string;
  fileName: string;
  fileSize: number;
  url: string;
  locationText?: string;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedAt?: any;
  reviewedBy?: string;
  createdAt: any;
}

export default function AdminContributions() {
  const [mediaItems, setMediaItems] = useState<ContributorMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingItem, setRejectingItem] = useState<ContributorMedia | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Video preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
    }, (error) => {
      console.error('Error fetching contributions:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [statusFilter]);

  const handleApprove = async (item: ContributorMedia) => {
    setProcessingId(item.id);
    try {
      // Update media document
      await updateDoc(doc(db, 'media', item.id), {
        reviewStatus: 'approved',
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update contributor stats
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
      setProcessingId(null);
    }
  };

  const openRejectModal = (item: ContributorMedia) => {
    setRejectingItem(item);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectingItem) return;
    
    setProcessingId(rejectingItem.id);
    try {
      // Update media document
      await updateDoc(doc(db, 'media', rejectingItem.id), {
        reviewStatus: 'rejected',
        rejectionReason: rejectionReason.trim() || null,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update contributor stats
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
      setProcessingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  const pendingCount = mediaItems.filter(i => i.reviewStatus === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contributions</h1>
          <p className="text-gray-600">Review uploads from individual contributors</p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReviewStatus)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending Review ({pendingCount})</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : mediaItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {statusFilter === 'pending' ? (
              <Clock className="w-8 h-8 text-gray-400" />
            ) : statusFilter === 'approved' ? (
              <CheckCircle className="w-8 h-8 text-gray-400" />
            ) : statusFilter === 'rejected' ? (
              <XCircle className="w-8 h-8 text-gray-400" />
            ) : (
              <PlayCircle className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <p className="text-gray-500 font-medium">No {statusFilter !== 'all' ? statusFilter : ''} contributions</p>
          <p className="text-sm text-gray-400 mt-1">
            {statusFilter === 'pending' 
              ? 'All caught up! No videos waiting for review.'
              : 'Contributions will appear here when submitted.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Video</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Contributor</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Location</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 hidden lg:table-cell">Uploaded</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mediaItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setPreviewUrl(item.url)}
                          className="relative group"
                        >
                          <div className="w-16 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
                            <PlayCircle className="w-6 h-6 text-white opacity-70 group-hover:opacity-100 transition" />
                          </div>
                        </button>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                            {item.fileName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatFileSize(item.fileSize)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[140px]">
                            {item.contributorName || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-400 truncate max-w-[140px]">
                            {item.contributorEmail}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      {item.locationText ? (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[150px]">{item.locationText}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        {formatDate(item.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
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
                            <p className="text-xs text-gray-500 mt-1 max-w-[120px] truncate" title={item.rejectionReason}>
                              {item.rejectionReason}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {item.reviewStatus === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(item)}
                              disabled={processingId === item.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                            >
                              {processingId === item.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle className="w-3 h-3" />
                              )}
                              Approve
                            </button>
                            <button
                              onClick={() => openRejectModal(item)}
                              disabled={processingId === item.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                            >
                              <XCircle className="w-3 h-3" />
                              Reject
                            </button>
                          </>
                        )}
                        {item.reviewStatus !== 'pending' && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                          >
                            <PlayCircle className="w-3 h-3" />
                            View
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                placeholder="e.g., Video is too dark, audio missing, wrong location..."
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
                disabled={processingId === rejectingItem.id}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {processingId === rejectingItem.id ? (
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

      {/* Video Preview Modal */}
      {previewUrl && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white/70 hover:text-white"
            onClick={() => setPreviewUrl(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <video
            src={previewUrl}
            controls
            autoPlay
            className="max-w-full max-h-full rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

