import { useState, useEffect } from 'react';
import { VideoItem } from '@/app/admin/robot-intelligence/media/page';
import { Film, Square, CheckSquare, Minus, Upload, Loader2, Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebaseClient';
import { collection, getDocs, query, where } from 'firebase/firestore';

interface Organization {
  id: string;
  name: string;
  type: string;
}

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
  const { user } = useAuth();
  const [partners, setPartners] = useState<Organization[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const exportReady = media.filter(v => v.reviewStatus === 'approved');
  const selectedExportReady = exportReady.filter(v => selectedIds.has(v.id));
  const allSelected = exportReady.length > 0 && exportReady.every(v => selectedIds.has(v.id));
  const someSelected = exportReady.some(v => selectedIds.has(v.id));

  // Fetch OEM partners
  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const q = query(collection(db, 'organizations'), where('type', '==', 'oem_partner'));
        const snapshot = await getDocs(q);
        const orgs: Organization[] = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || doc.id,
          type: doc.data().type,
        }));
        setPartners(orgs.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error('Failed to fetch partners:', err);
      } finally {
        setLoadingPartners(false);
      }
    };
    fetchPartners();
  }, []);

  const handleSelectAll = () => {
    onSelectAll(exportReady.map(v => v.id));
  };

  const handleExport = async () => {
    if (!user || !selectedPartnerId || selectedExportReady.length === 0) return;
    
    setExporting(true);
    setExportSuccess(null);
    
    try {
      const selectedPartner = partners.find(p => p.id === selectedPartnerId);
      const videoIds = selectedExportReady.map(v => v.id);
      const totalSizeBytes = selectedExportReady.reduce((sum, v) => sum + (v.size || 0), 0);
      const totalDurationSeconds = selectedExportReady.reduce((sum, v) => sum + (v.duration || 0), 0);

      const token = await user.getIdToken();
      const response = await fetch('/api/admin/exports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          partnerId: selectedPartnerId,
          partnerName: selectedPartner?.name,
          videoIds,
          totalSizeBytes,
          totalDurationSeconds,
          notes: `Exported ${videoIds.length} videos from Media Library`,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Export failed');
      }

      setExportSuccess(`Exported ${videoIds.length} videos to ${selectedPartner?.name}`);
      onSelectAll([]); // Clear selection
      setSelectedPartnerId(''); // Reset partner selection
      
      // Clear success message after 5 seconds
      setTimeout(() => setExportSuccess(null), 5000);
    } catch (err: any) {
      console.error('Export failed:', err);
      alert('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const selectedCount = selectedExportReady.length;
  const selectedSize = selectedExportReady.reduce((sum, v) => sum + (v.size || 0), 0);
  const selectedDuration = selectedExportReady.reduce((sum, v) => sum + (v.duration || 0), 0);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatTotalDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="space-y-4">
      {/* Export Controls */}
      <div className="flex items-center justify-between gap-4 p-4 bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#1f1f1f] rounded-lg">
        <div className="flex items-center gap-4">
          {/* Partner Selector */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <select
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              disabled={loadingPartners}
              className="px-3 py-2 text-sm bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#2a2a2a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
            >
              <option value="">Select partner...</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </div>

          {/* Selection Summary */}
          {selectedCount > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-3">
              <span className="font-medium text-gray-900 dark:text-white">{selectedCount} selected</span>
              <span>•</span>
              <span>{formatTotalDuration(selectedDuration)}</span>
              <span>•</span>
              <span>{formatSize(selectedSize)}</span>
            </div>
          )}
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={exporting || !selectedPartnerId || selectedCount === 0}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {exporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Export to Partner
            </>
          )}
        </button>
      </div>

      {/* Success Message */}
      {exportSuccess && (
        <div className="p-3 bg-green-50 dark:bg-green-500/20 border border-green-200 dark:border-green-500/30 rounded-lg text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
          <CheckSquare className="w-4 h-4" />
          {exportSuccess}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600 dark:text-gray-400">
          {exportReady.length} videos ready for export
          {exportReady.length > 0 && (
            <span className="text-gray-400 dark:text-gray-500 ml-2">
              • {formatTotalDuration(exportReady.reduce((sum, v) => sum + (v.duration || 0), 0))} total
              • {formatSize(exportReady.reduce((sum, v) => sum + (v.size || 0), 0))}
            </span>
          )}
        </p>
      </div>

      {exportReady.length > 0 ? (
        <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#1f1f1f] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-[#1f1f1f]">
              <tr>
                <th className="w-10 px-4 py-3 text-left">
                  <button onClick={handleSelectAll} className="p-1 hover:bg-gray-200 dark:hover:bg-[#1f1f1f] rounded">
                    {allSelected ? <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" /> : someSelected ? <Minus className="w-5 h-5 text-blue-600 dark:text-blue-400" /> : <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">VIDEO</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">LOCATION</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">DURATION</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">UPLOADED</th>
              </tr>
            </thead>
            <tbody>
              {exportReady.map(video => (
                <tr 
                  key={video.id} 
                  className={`border-b border-gray-200 dark:border-[#1f1f1f] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] ${selectedIds.has(video.id) ? 'bg-blue-50 dark:bg-blue-500/10' : ''}`}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => onToggleSelect(video.id, e)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-[#1f1f1f] rounded"
                    >
                      {selectedIds.has(video.id) ? <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" /> : <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {video.thumbnailUrl ? (
                        <img 
                          src={video.thumbnailUrl} 
                          alt={video.fileName}
                          className="w-10 h-10 object-cover rounded bg-gray-100 dark:bg-[#1a1a1a]"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 dark:bg-[#1a1a1a] rounded flex items-center justify-center">
                          <Film className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        </div>
                      )}
                      <span className="font-medium text-sm text-gray-900 dark:text-white">{video.fileName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{video.locationName || video.locationId?.slice(0, 8) || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatDuration(video.duration)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatDate(video.uploadedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#1f1f1f] rounded-lg">
          <Film className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No videos ready for export</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Approve videos in the Blur Review and Label Review tabs first</p>
        </div>
      )}
    </div>
  );
}
