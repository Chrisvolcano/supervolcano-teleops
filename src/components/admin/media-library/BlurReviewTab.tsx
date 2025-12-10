import { VideoItem } from '@/app/admin/robot-intelligence/media/page';
import { RefreshCw } from 'lucide-react';

interface BlurReviewTabProps {
  media: VideoItem[];
  onApplyBlur: (videoId: string) => Promise<void>;
  onApproveBlur: (videoId: string) => Promise<void>;
  onRejectBlur: (videoId: string) => Promise<void>;
  blurringIds: Set<string>;
  processingIds: Set<string>;
  formatDate: (d: string | null) => string;
}

export function BlurReviewTab({ 
  media,
  onApplyBlur,
  onApproveBlur,
  onRejectBlur,
  blurringIds,
  processingIds,
  formatDate,
}: BlurReviewTabProps) {
  // Videos that need blur OR have blur pending approval
  const needsBlurReview = media.filter(v => {
    // No blur status or not complete = needs blur
    if (!v.blurStatus || v.blurStatus === 'none') return true;
    // Has reviewStatus that's not approved = needs review
    if (typeof v.reviewStatus === 'string' && v.reviewStatus !== 'approved') return true;
    return false;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          {needsBlurReview.length} videos need blur review
        </p>
      </div>

      {needsBlurReview.length > 0 ? (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-sm text-gray-500">
                <th className="px-4 py-3 font-medium">VIDEO</th>
                <th className="px-4 py-3 font-medium">LOCATION</th>
                <th className="px-4 py-3 font-medium">BLUR STATUS</th>
                <th className="px-4 py-3 font-medium">UPLOADED</th>
                <th className="px-4 py-3 font-medium">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {needsBlurReview.map(video => {
                const isBlurring = blurringIds.has(video.id);
                const isProcessing = processingIds.has(video.id);
                const isLoading = isBlurring || isProcessing;

                return (
                  <tr key={video.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-sm">{video.fileName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{video.locationName || video.locationId?.slice(0, 8) || '—'}</td>
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
                    <td className="px-4 py-3">
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
