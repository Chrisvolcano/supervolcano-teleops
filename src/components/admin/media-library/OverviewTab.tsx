import { VideoItem } from '@/app/admin/robot-intelligence/media/page';
import { StatsRow } from '@/components/ui/StatsRow';
import { ApprovalStatus } from '@/components/ui/ApprovalStatus';
import { Film, RefreshCw, Square, CheckSquare, Minus } from 'lucide-react';

interface OverviewTabProps {
  media: VideoItem[];
  filteredMedia: VideoItem[];
  stats: {
    blurPending: number;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    pendingApproval: number;
    approved: number;
    rejected: number;
  };
  totalCount: number;
  filter: string;
  setFilter: (filter: string) => void;
  trainingFilter: 'all' | 'pending' | 'approved' | 'rejected';
  setTrainingFilter: (filter: 'all' | 'pending' | 'approved' | 'rejected') => void;
  formatTotalDuration: (seconds: number) => string;
  loading: boolean;
  error: string | null;
  selectedIds: Set<string>;
  allSelected: boolean;
  someSelected: boolean;
  selectAll: () => void;
  clearSelection: () => void;
  toggleSelection: (id: string, event: React.MouseEvent) => void;
  setSelectedVideoIndex: (index: number | null) => void;
  formatDuration: (s: number | null) => string;
  formatSize: (b: number | null) => string;
  formatDate: (d: string | null) => string;
  getProcessingStatusBadge: (video: VideoItem) => JSX.Element;
  getTrainingBadge: (status: string) => JSX.Element;
}

export function OverviewTab({
  media,
  filteredMedia,
  stats,
  totalCount,
  filter,
  setFilter,
  trainingFilter,
  setTrainingFilter,
  formatTotalDuration,
  loading,
  error,
  selectedIds,
  allSelected,
  someSelected,
  selectAll,
  clearSelection,
  toggleSelection,
  setSelectedVideoIndex,
  formatDuration,
  formatSize,
  formatDate,
  getProcessingStatusBadge,
  getTrainingBadge,
}: OverviewTabProps) {
  // Calculate blur status counts
  const blurPending = media.filter(v => typeof v.reviewStatus === 'string' && v.reviewStatus !== 'approved').length;
  const blurDone = media.filter(v => v.reviewStatus === 'approved').length;
  
  // Calculate label status counts
  const labelsPending = media.filter(v => v.aiStatus === 'pending').length;
  const labelsDone = media.filter(v => v.aiStatus === 'completed').length;

  // Sum only non-null durations
  const totalDuration = media.reduce((sum, v) => {
    const dur = v.duration ?? (v as any).durationSeconds ?? null;
    if (dur !== null && typeof dur === 'number' && dur > 0) {
      return sum + dur;
    }
    return sum;
  }, 0);
  const uniqueUsers = new Set(media.map(v => v.userId).filter(Boolean));
  const uniqueLocations = new Set(media.map(v => v.locationId).filter(Boolean));
  const totalFootage = totalDuration > 0 ? formatTotalDuration(totalDuration) : '—';

  return (
    <>
      {/* Summary Stats */}
      <StatsRow items={[
        { value: totalFootage, label: 'Total Footage' },
        { value: filteredMedia.length, label: 'Videos' },
        { value: uniqueUsers.size, label: 'Contributors' },
        { value: uniqueLocations.size, label: 'Locations' },
      ]} />

      {/* Blur Status - Independent Row */}
      <div className="mb-4">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          BLUR
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">○</span>
            <span className="text-sm font-medium text-gray-600">{blurPending} Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-600">●</span>
            <span className="text-sm font-medium text-gray-600">{blurDone} Done</span>
          </div>
        </div>
      </div>

      {/* Labels Status - Independent Row */}
      <div className="mb-4">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          LABELS
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">○</span>
            <span className="text-sm font-medium text-gray-600">{labelsPending} Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-600">●</span>
            <span className="text-sm font-medium text-gray-600">{labelsDone} Done</span>
          </div>
        </div>
      </div>

      {/* Training Approval Status */}
      <ApprovalStatus
        label="TRAINING"
        pending={stats.pendingApproval}
        approved={stats.approved}
        rejected={stats.rejected}
        onClickPending={() => {
          setTrainingFilter('pending');
          setFilter('completed');
        }}
        onClickApproved={() => {
          setTrainingFilter('approved');
          setFilter('all');
        }}
        onClickRejected={() => {
          setTrainingFilter('rejected');
          setFilter('all');
        }}
      />

      {/* Filter Dropdown */}
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
        </div>
      </div>

      {error && (
        <div className={`mb-4 p-4 border rounded-lg ${
          error.includes('Skipped') || error.includes('blur pending') 
            ? 'bg-yellow-50 border-yellow-200 text-yellow-700' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {error}
        </div>
      )}

      {/* Video Table */}
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
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">SOURCE</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">LOCATION</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">DURATION</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">SIZE</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">PROCESSING STATUS</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">TRAINING</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">CREATED</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-500"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />Loading...</td></tr>
            ) : filteredMedia.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-500">No videos found</td></tr>
            ) : (
              filteredMedia.map((item, index) => (
                <tr key={item.id} className={`border-b hover:bg-gray-50 cursor-pointer ${selectedIds.has(item.id) ? 'bg-blue-50' : ''} ${item.trainingStatus === 'approved' ? 'bg-green-50/30' : ''} ${item.trainingStatus === 'rejected' ? 'bg-red-50/30' : ''}`} onClick={() => setSelectedVideoIndex(index)}>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => toggleSelection(item.id, e)} className="p-1 hover:bg-gray-200 rounded">
                      {selectedIds.has(item.id) ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-400" />}
                    </button>
                  </td>
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center"><Film className="w-5 h-5 text-gray-400" /></div><span className="font-medium text-sm truncate max-w-[200px]">{item.fileName}</span></div></td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {(item.source === 'google-drive' || item.importSource === 'google-drive') ? (
                      <span title="Google Drive Import" className="text-lg">📁</span>
                    ) : (
                      <span title="App Upload" className="text-lg">📱</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.locationName || item.locationId?.slice(0, 8) || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDuration(item.duration)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatSize(item.size)}</td>
                  <td className="px-4 py-3">{getProcessingStatusBadge(item)}</td>
                  <td className="px-4 py-3">{getTrainingBadge(item.trainingStatus)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(item.uploadedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

