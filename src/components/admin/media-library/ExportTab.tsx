import { VideoItem } from '@/app/admin/robot-intelligence/media/page';
import { Film, Square, CheckSquare, Minus } from 'lucide-react';

interface ExportTabProps {
  media: VideoItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, event: React.MouseEvent) => void;
  onSelectAll: (ids: string[]) => void;
  formatDuration: (s: number | null) => string;
  formatDate: (d: string | null) => string;
}

export function ExportTab({ 
  media, 
  selectedIds,
  onToggleSelect,
  onSelectAll,
  formatDuration,
  formatDate,
}: ExportTabProps) {
  const exportReady = media.filter(v => v.reviewStatus === 'approved');
  const allSelected = exportReady.length > 0 && exportReady.every(v => selectedIds.has(v.id));
  const someSelected = exportReady.some(v => selectedIds.has(v.id));

  const handleSelectAll = () => {
    onSelectAll(exportReady.map(v => v.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          {exportReady.length} videos ready for export
        </p>
      </div>

      {exportReady.length > 0 ? (
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
              {exportReady.map(video => (
                <tr 
                  key={video.id} 
                  className={`border-b hover:bg-gray-50 ${selectedIds.has(video.id) ? 'bg-blue-50' : ''}`}
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
          No videos ready for export
        </div>
      )}
    </div>
  );
}

