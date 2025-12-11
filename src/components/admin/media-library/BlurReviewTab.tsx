import { VideoItem } from '@/app/admin/robot-intelligence/media/page';
import { RefreshCw, Film, Square, CheckSquare, Minus, Loader2 } from 'lucide-react';

interface BlurReviewTabProps {
  media: VideoItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, event: React.MouseEvent) => void;
  onSelectAll: (ids: string[]) => void;
  onApplyBlur: (videoId: string) => Promise<void>;
  onApproveBlur: (videoId: string) => Promise<void>;
  onRejectBlur: (videoId: string) => Promise<void>;
  blurringIds: Set<string>;
  processingIds: Set<string>;
  formatDate: (d: string | null) => string;
  onVideoClick: (video: VideoItem) => void;
}

export function BlurReviewTab({ 
  media,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onApplyBlur,
  onApproveBlur,
  onRejectBlur,
  blurringIds,
  processingIds,
  formatDate,
  onVideoClick,
}: BlurReviewTabProps) {
  // Videos that need blur OR have blur pending approval
  const needsBlurReview = media.filter(v => {
    // Already blurred = skip
    if (v.blurStatus && v.blurStatus !== 'none') return false;
    
    // Face detection completed: only show if faces found
    if (v.faceDetectionStatus === 'completed') {
      return v.hasFaces === true;
    }
    
    // Face detection pending/processing: show with status indicator
    if (v.faceDetectionStatus === 'pending' || v.faceDetectionStatus === 'processing') {
      return true; // Show but indicate scanning
    }
    
    // No face detection yet (old videos): show all
    return true;
  });

  const allSelected = needsBlurReview.length > 0 && needsBlurReview.every(v => selectedIds.has(v.id));
  const someSelected = needsBlurReview.some(v => selectedIds.has(v.id));
  const selectedCount = needsBlurReview.filter(v => selectedIds.has(v.id)).length;

  const handleSelectAll = () => {
    onSelectAll(needsBlurReview.map(v => v.id));
  };

  const handleBlurSelected = async () => {
    const toBlur = needsBlurReview.filter(v => selectedIds.has(v.id) && (!v.blurStatus || v.blurStatus === 'none'));
    for (const video of toBlur) {
      await onApplyBlur(video.id);
    }
  };

  const handleBlurAll = async () => {
    const toBlur = needsBlurReview.filter(v => !v.blurStatus || v.blurStatus === 'none');
    for (const video of toBlur) {
      await onApplyBlur(video.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          {needsBlurReview.length} videos need blur review
        </p>
        
        <div className="flex gap-2">
          {/* Show "Blur Selected" when items selected */}
          {selectedIds.size > 0 && (
            <button
              onClick={handleBlurSelected}
              disabled={blurringIds.size > 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {blurringIds.size > 0 ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Blurring...
                </>
              ) : (
                `Blur Selected (${selectedCount})`
              )}
            </button>
          )}
          
          {/* Always show "Blur All" like Label Review shows "Process All" */}
          {needsBlurReview.length > 0 && selectedIds.size === 0 && (
            <button
              onClick={handleBlurAll}
              disabled={blurringIds.size > 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {blurringIds.size > 0 ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Blurring...
                </>
              ) : (
                `Blur All (${needsBlurReview.length})`
              )}
            </button>
          )}
        </div>
      </div>

      {needsBlurReview.length > 0 ? (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="w-10 px-4 py-3 text-left">
                  <button onClick={handleSelectAll} className="p-1 hover:bg-gray-200 rounded">
                    {allSelected ? <CheckSquare className="w-5 h-5 text-blue-600" /> : someSelected ? <Minus className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-400" />}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">VIDEO</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">LOCATION</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">FACES</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">BLUR STATUS</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">UPLOADED</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {needsBlurReview.map(video => {
                const isBlurring = blurringIds.has(video.id);
                const isProcessing = processingIds.has(video.id);
                const isLoading = isBlurring || isProcessing;

                return (
                  <tr 
                    key={video.id} 
                    className={`border-b hover:bg-gray-50 cursor-pointer ${selectedIds.has(video.id) ? 'bg-blue-50' : ''}`}
                    onClick={() => onVideoClick(video)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => onToggleSelect(video.id, e)} className="p-1 hover:bg-gray-200 rounded">
                        {selectedIds.has(video.id) ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-400" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {video.thumbnailUrl ? (
                          <img 
                            src={video.thumbnailUrl} 
                            alt={video.fileName}
                            className="w-10 h-10 object-cover rounded bg-gray-100"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                            <Film className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <span className="font-medium text-sm text-gray-900">{video.fileName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{video.locationName || video.locationId?.slice(0, 8) || '—'}</td>
                    <td className="px-4 py-3">
                      {video.faceDetectionStatus === 'processing' && (
                        <span className="text-blue-600 flex items-center gap-1 text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Scanning...
                        </span>
                      )}
                      {video.faceDetectionStatus === 'completed' && video.hasFaces && (
                        <span className="text-amber-600 text-sm">{video.faceCount || 0} face(s) detected</span>
                      )}
                      {video.faceDetectionStatus === 'completed' && !video.hasFaces && (
                        <span className="text-green-600 text-sm">No faces</span>
                      )}
                      {video.faceDetectionStatus === 'failed' && (
                        <span className="text-red-600 text-sm">Scan failed</span>
                      )}
                      {!video.faceDetectionStatus && (
                        <span className="text-gray-400 text-sm">Not scanned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {/* Show current blur state */}
                      {!video.blurStatus || video.blurStatus === 'none' ? (
                        <span className="text-amber-600 text-sm">Not blurred</span>
                      ) : video.blurStatus === 'processing' ? (
                        <span className="text-blue-600 text-sm flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Processing...
                        </span>
                      ) : video.reviewStatus === 'pending' ? (
                        <span className="text-blue-600 text-sm">Awaiting approval</span>
                      ) : video.reviewStatus === 'rejected' ? (
                        <span className="text-red-600 text-sm">Rejected</span>
                      ) : (
                        <span className="text-gray-500 text-sm capitalize">{video.blurStatus}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(video.uploadedAt)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {(!video.blurStatus || video.blurStatus === 'none') && (
                          <button
                            onClick={() => onApplyBlur(video.id)}
                            disabled={isLoading}
                            className="text-blue-600 hover:underline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isBlurring ? 'Blurring...' : 'Apply Blur'}
                          </button>
                        )}
                        {video.reviewStatus === 'pending' && (
                          <>
                            <button
                              onClick={() => onApproveBlur(video.id)}
                              disabled={isLoading}
                              className="text-green-600 hover:underline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isProcessing ? 'Processing...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => onRejectBlur(video.id)}
                              disabled={isLoading}
                              className="text-red-600 hover:underline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isProcessing ? 'Processing...' : 'Reject'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center text-gray-400 py-8 bg-white border rounded-lg">
          All videos have been blur reviewed
        </div>
      )}
    </div>
  );
}
