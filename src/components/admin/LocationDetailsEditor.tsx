'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, Pencil } from 'lucide-react';
import { getAuth } from 'firebase/auth';

interface LocationDetailsEditorProps {
  location: any;
  onSave: () => void;
}

export default function LocationDetailsEditor({ location, onSave }: LocationDetailsEditorProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(location?.name || '');
  const [address, setAddress] = useState(location?.address || '');
  const [error, setError] = useState<string | null>(null);

  // Sync state when location prop changes
  useEffect(() => {
    if (!editing) {
      setName(location?.name || '');
      setAddress(location?.address || '');
    }
  }, [location, editing]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();

      const response = await fetch(`/api/admin/locations/${location.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update location');
      }

      setEditing(false);
      onSave();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-gray-500 mb-1">Location Name</div>
            <div className="font-medium text-gray-900">{location?.name || 'Unnamed'}</div>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
        <div>
          <div className="text-sm text-gray-500 mb-1">Address</div>
          <div className="text-gray-900">{location?.address || 'No address'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Location Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Isaac's House"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="123 Main St, City, State"
        />
      </div>
      
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
        <button
          onClick={() => {
            setName(location?.name || '');
            setAddress(location?.address || '');
            setEditing(false);
            setError(null);
          }}
          disabled={saving}
          className="px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

