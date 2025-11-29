/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Cleaner {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

interface Assignment {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
}

interface AssignCleanersModalProps {
  locationId: string;
  locationName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignCleanersModal({
  locationId,
  locationName,
  onClose,
  onSuccess,
}: AssignCleanersModalProps) {
  const { getIdToken } = useAuth();
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch cleaners and current assignments
  useEffect(() => {
    loadData();
  }, [locationId]);

  async function loadData() {
    setLoading(true);
    setError(null);
    
    try {
      const token = await getIdToken();
      
      // Fetch all cleaners
      const cleanersRes = await fetch('/api/admin/cleaners', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const cleanersData = await cleanersRes.json();
      
      if (!cleanersData.success) {
        throw new Error(cleanersData.error);
      }
      
      // Fetch current assignments
      const assignmentsRes = await fetch(`/api/admin/locations/${locationId}/assignments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const assignmentsData = await assignmentsRes.json();
      
      if (!assignmentsData.success) {
        throw new Error(assignmentsData.error);
      }
      
      setCleaners(cleanersData.cleaners);
      setAssignments(assignmentsData.assignments);
      
      // Pre-select currently assigned cleaners
      const assignedIds = new Set<string>(
        (assignmentsData.assignments as Assignment[]).map((a) => a.user_id)
      );
      setSelectedUserIds(assignedIds);
      
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleCleaner(userId: string) {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    
    try {
      const token = await getIdToken();
      
      // Get currently assigned user IDs
      const currentlyAssigned = new Set(assignments.map(a => a.user_id));
      
      // Determine who to add and who to remove
      const toAdd = Array.from(selectedUserIds).filter(id => !currentlyAssigned.has(id));
      const toRemove = Array.from(currentlyAssigned).filter(id => !selectedUserIds.has(id));
      
      // Add new assignments (one request per user)
      for (const userId of toAdd) {
        const addRes = await fetch(`/api/admin/locations/${locationId}/assignments`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: userId,
            role: 'location_cleaner',
          }),
        });
        
        const addData = await addRes.json();
        if (!addData.success) {
          throw new Error(addData.error);
        }
      }
      
      // Remove old assignments (need assignment IDs, not user IDs)
      for (const userId of toRemove) {
        const assignment = assignments.find(a => a.user_id === userId);
        if (assignment) {
          const removeRes = await fetch(
            `/api/admin/locations/${locationId}/assignments?assignmentId=${assignment.id}`,
            {
              method: 'DELETE',
              headers: { 
                'Authorization': `Bearer ${token}`,
              },
            }
          );
          
          const removeData = await removeRes.json();
          if (!removeData.success) {
            throw new Error(removeData.error);
          }
        }
      }
      
      console.log(`✅ Updated assignments: +${toAdd.length}, -${toRemove.length}`);
      onSuccess();
      onClose();
      
    } catch (err: any) {
      console.error('Failed to save assignments:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Assign Cleaners
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {locationName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
            </div>
          ) : error ? (
            <div className="text-red-600 text-center py-12">
              {error}
            </div>
          ) : cleaners.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <UserPlus className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>
                No cleaners found. Create location cleaner accounts first.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {cleaners.map(cleaner => (
                <label
                  key={cleaner.uid}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedUserIds.has(cleaner.uid)}
                    onChange={() => toggleCleaner(cleaner.uid)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {cleaner.displayName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {cleaner.email}
                    </div>
                  </div>
                  {assignments.some(a => a.user_id === cleaner.uid) && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Currently Assigned
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedUserIds.size} cleaner{selectedUserIds.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Assignments'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


