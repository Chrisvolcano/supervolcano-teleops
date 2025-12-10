import { VideoItem } from '@/app/admin/robot-intelligence/media/page';
import { Film } from 'lucide-react';

interface ExportTabProps {
  media: VideoItem[];
}

export function ExportTab({ media }: ExportTabProps) {
  const exportReady = media.filter(v => v.reviewStatus === 'approved');

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
              <tr className="text-left text-sm text-gray-500">
                <th className="px-4 py-3 font-medium">VIDEO</th>
                <th className="px-4 py-3 font-medium">LOCATION</th>
                <th className="px-4 py-3 font-medium">DURATION</th>
                <th className="px-4 py-3 font-medium">UPLOADED</th>
              </tr>
            </thead>
            <tbody>
              {exportReady.map(video => (
                <tr key={video.id} className="border-b hover:bg-gray-50">
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
                  <td className="px-4 py-3 text-sm text-gray-600">{video.duration ? `${Math.floor(video.duration / 60)}:${Math.floor(video.duration % 60).toString().padStart(2, '0')}` : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{video.uploadedAt ? new Date(video.uploadedAt).toLocaleDateString() : '—'}</td>
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

