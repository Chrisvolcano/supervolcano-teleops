import { VideoItem } from '@/app/admin/robot-intelligence/media/page';
import { RefreshCw, Film, Square, CheckSquare, Minus, Loader2, Eye, Check, X } from 'lucide-react';
import { useState } from 'react';

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
  const [previewVideo, setPreviewVideo] = useState<VideoItem | null>(null);
  const [showBlurred, setShowBlurred] = useState(true);

  // Section 1: Videos that need blur applied
  const needsBlur = media.filter(v => {
    if (v.blurStatus === 'complete' || v.blurStatus === 'processing') return false;
    if (v.faceDetectionStatus === 'completed') return v.hasFaces === true;
    if (v.faceDetectionStatus === 'pending' || v.faceDetectionStatus === 'processing') return true;
    return true;
  });

  // Section 2: Videos with blur complete that need review
  const needsBlurReview = media.filter(v => 
    v.blurStatus === 'complete' && v.blurApproved !== true
  );

  const allSelectedNeedsBlur = needsBlur.length > 0 && needsBlur.every(v => selectedIds.has(v.id));
  const someSelectedNeedsBlur = needsBlur.some(v => selectedIds.has(v.id));

  const handleSelectAllNeedsBlur = () => {
    onSelectAll(needsBlur.map(v => v.id));
  };

  const handleBlurSelected = async () => {
    const toBlur = needsBlur.filter(v => selectedIds.has(v.id) && (!v.blurStatus || v.blurStatus === 'none' || v.blurStatus === 'failed'));
    for (const video of toBlur) {
      await onApplyBlur(video.id);
    }
  };

  const handleBlurAll = async () => {
    const toBlur = needsBlur.filter(v => !v.blurStatus || v.blurStatus === 'none' || v.blurStatus === 'failed');
    for (const video of toBlur) {
      await onApplyBlur(video.id);
    }
  };

  const openPreview = (video: VideoItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewVideo(video);
    setShowBlurred(true);
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Needs Blur */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Needs Blur</h3>
            <p className="text-sm text-gray-500">{needsBlur.length} videos with faces detected</p>
          </div>
          
          <div className="flex gap-2">
            {selectedIds.size > 0 && needsBlur.some(v => selectedIds.has(v.id)) && (
              <button
                onClick={handleBlurSelected}
                disabled={blurringIds.size > 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              >
                {blurringIds.size > 0 ? <><RefreshCw className="w-4 h-4 animate-spin" />Blurring...</> : `Blur Selected (${needsBlur.filter(v => selectedIds.has(v.id)).length})`}
              </button>
            )}
            
            {needsBlur.length > 0 && !needsBlur.some(v => selectedIds.has(v.id)) && (
              <button
                onClick={handleBlurAll}
                disabled={blurringIds.size > 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              >
                {blurringIds.size > 0 ? <><RefreshCw className="w-4 h-4 animate-spin" />Blurring...</> : `Blur All (${needsBlur.length})`}
              </button>
            )}
          </div>
        </div>

        {needsBlur.length > 0 ? (
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="w-10 px-4 py-3 text-left">
                    <button onClick={handleSelectAllNeedsBlur} className="p-1 hover:bg-gray-200 rounded">
                      {allSelectedNeedsBlur ? <CheckSquare className="w-5 h-5 text-blue-600" /> : someSelectedNeedsBlur ? <Minus className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-400" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">VIDEO</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">LOCATION</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">FACES</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">UPLOADED</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {needsBlur.map(video => {
                  const isBlurring = blurringIds.has(video.id);
                  return (
                    <tr key={video.id} className={`border-b hover:bg-gray-50 cursor-pointer ${selectedIds.has(video.id) ? 'bg-blue-50' : ''}`} onClick={() => onVideoClick(video)}>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => onToggleSelect(video.id, e)} className="p-1 hover:bg-gray-200 rounded">
                          {selectedIds.has(video.id) ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-400" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {video.thumbnailUrl ? <img src={video.thumbnailUrl} alt={video.fileName} className="w-10 h-10 object-cover rounded bg-gray-100" /> : <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center"><Film className="w-5 h-5 text-gray-400" /></div>}
                          <span className="font-medium text-sm text-gray-900">{video.fileName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{video.locationName || '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        {video.faceDetectionStatus === 'processing' && <span className="text-blue-600 flex items-center gap-1"><Loader2 className="w-4 h-4 animate-spin" />Scanning...</span>}
                        {video.faceDetectionStatus === 'completed' && video.hasFaces && <span className="text-amber-600">{video.faceCount || 1} face(s)</span>}
                        {video.faceDetectionStatus === 'pending' && <span className="text-gray-400">Pending</span>}
                        {!video.faceDetectionStatus && <span className="text-gray-400">Not scanned</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(video.uploadedAt)}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => onApplyBlur(video.id)} disabled={isBlurring} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                          {isBlurring ? <><RefreshCw className="w-3 h-3 animate-spin" />Blurring...</> : 'Blur'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-400 py-6 bg-gray-50 border border-dashed rounded-lg">No videos need blur</div>
        )}
      </div>

      {/* Section 2: Review Blurred */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Review Blurred</h3>
          <p className="text-sm text-gray-500">{needsBlurReview.length} videos ready for review</p>
        </div>

        {needsBlurReview.length > 0 ? (
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">VIDEO</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">LOCATION</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">FACES BLURRED</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">BLURRED</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {needsBlurReview.map(video => {
                  const isProcessing = processingIds.has(video.id);
                  return (
                    <tr key={video.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {video.thumbnailUrl ? <img src={video.thumbnailUrl} alt={video.fileName} className="w-10 h-10 object-cover rounded bg-gray-100" /> : <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center"><Film className="w-5 h-5 text-gray-400" /></div>}
                          <span className="font-medium text-sm text-gray-900">{video.fileName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{video.locationName || '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs"><Check className="w-3 h-3" />{video.faceCount || 1} face(s) blurred</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(video.updatedAt || video.uploadedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={(e) => openPreview(video, e)} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"><Eye className="w-3 h-3" />Preview</button>
                          <button onClick={() => onApproveBlur(video.id)} disabled={isProcessing} className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"><Check className="w-3 h-3" />Approve</button>
                          <button onClick={() => onRejectBlur(video.id)} disabled={isProcessing} className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"><X className="w-3 h-3" />Reject</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-400 py-6 bg-gray-50 border border-dashed rounded-lg">No blurred videos awaiting review</div>
        )}
      </div>

      {/* Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setPreviewVideo(null)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">{previewVideo.fileName}</h3>
                <p className="text-sm text-gray-500">Compare original vs blurred</p>
              </div>
              <button onClick={() => setPreviewVideo(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-center gap-4 mb-4">
                <button onClick={() => setShowBlurred(false)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${!showBlurred ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Original</button>
                <button onClick={() => setShowBlurred(true)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${showBlurred ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Blurred</button>
              </div>
              <div className="bg-black rounded-lg overflow-hidden aspect-video">
                <video key={showBlurred ? 'blurred' : 'original'} src={showBlurred && previewVideo.blurredUrl ? previewVideo.blurredUrl : previewVideo.url} controls autoPlay className="w-full h-full" />
              </div>
              <p className="text-center text-sm text-gray-500 mt-2">{showBlurred ? 'Showing blurred version' : 'Showing original (unblurred)'}</p>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
              <button onClick={() => { onRejectBlur(previewVideo.id); setPreviewVideo(null); }} className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2"><X className="w-4 h-4" />Reject & Re-blur</button>
              <button onClick={() => { onApproveBlur(previewVideo.id); setPreviewVideo(null); }} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"><Check className="w-4 h-4" />Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
