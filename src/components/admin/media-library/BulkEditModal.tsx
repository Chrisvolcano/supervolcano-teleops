'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, MapPin } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import ContributorSelector, { ContributorData } from './ContributorSelector';

interface BulkEditModalProps {
  selectedIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkEditModal({ selectedIds, onClose, onSuccess }: BulkEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [contributor, setContributor] = useState<ContributorData>({
    contributorType: 'other',
    contributorId: null,
    contributorOrgId: null,
    contributorName: '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch('/api/admin/locations/firestore', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setLocations((data.locations || []).map((loc: any) => ({
          id: loc.id,
          name: loc.name,
        })));
      }
    } catch (err) {
      console.error('Failed to load locations:', err);
    }
  };

  const handleSave = async () => {
    if (!selectedLocation && !contributor.contributorName.trim()) {
      setError('Please select a location or enter contributor info');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();

      const updates: Record<string, any> = {};
      
      if (selectedLocation) {
        const loc = locations.find(l => l.id === selectedLocation);
        updates.locationId = selectedLocation;
        updates.locationName = loc?.name || '';
      }
      
      if (contributor.contributorName.trim()) {
        updates.contributorType = contributor.contributorType;
        updates.contributorId = contributor.contributorId;
        updates.contributorOrgId = contributor.contributorOrgId;
        updates.contributorName = contributor.contributorName;
      }

      const response = await fetch('/api/admin/videos/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ videoIds: selectedIds, updates }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update videos');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Edit {selectedIds.length} Videos</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Location */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4" />
              Assign Location (optional)
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select location...</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Contributor */}
          <ContributorSelector
            value={contributor}
            onChange={setContributor}
          />

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 text-gray-700 hover:text-gray-900">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

