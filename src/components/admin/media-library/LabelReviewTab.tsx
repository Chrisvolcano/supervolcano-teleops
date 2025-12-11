import { VideoItem } from '@/app/admin/robot-intelligence/media/page';
import { RefreshCw, Film, Square, CheckSquare, Minus } from 'lucide-react';

interface LabelReviewTabProps {
  media: VideoItem[];
  onProcessBatch: () => void;
  processing: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, event: React.MouseEvent) => void;
  onSelectAll: () => void;
  formatDuration: (s: number | null) => string;
  formatDate: (d: string | null) => string;
  onVideoClick: (video: VideoItem) => void;
}

export function LabelReviewTab({ 
  media, 
  onProcessBatch, 
  processing,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  formatDuration,
  formatDate,
  onVideoClick,
}: LabelReviewTabProps) {
  const needsLabels = media.filter(v => v.aiStatus === 'pending' || !v.aiStatus);
  const allSelected = needsLabels.length > 0 && needsLabels.every(v => selectedIds.has(v.id));
  const someSelected = needsLabels.some(v => selectedIds.has(v.id));

  const handleSelectAll = () => {
    onSelectAll();
  };

  return (
    <div className="space-y-4">
      {/* Header with count and action */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          {needsLabels.length} videos need AI labels
        </p>
        <button
          onClick={onProcessBatch}
          disabled={processing || needsLabels.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {processing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Process All (${needsLabels.length})`
          )}
        </button>
      </div>

      {/* Simple table showing only videos needing labels */}
      {needsLabels.length > 0 ? (
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
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">DURATION</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">UPLOADED</th>
              </tr>
            </thead>
            <tbody>
              {needsLabels.map(video => (
                <tr 
                  key={video.id} 
                  className={`border-b hover:bg-gray-50 cursor-pointer ${selectedIds.has(video.id) ? 'bg-blue-50' : ''}`}
                  onClick={() => onVideoClick(video)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => onToggleSelect(video.id, e)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
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
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDuration(video.duration)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(video.uploadedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center text-gray-400 py-8 bg-white border rounded-lg">
          All videos have been labeled
        </div>
      )}
    </div>
  );
}

