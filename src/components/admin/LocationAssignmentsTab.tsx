/**
 * LOCATION ASSIGNMENTS TAB
 * Display and manage cleaner assignments for a location
 * Last updated: 2025-11-26
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Trash2, Loader } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import AssignCleanerModal from './AssignCleanerModal';
import type { AssignmentWithUser } from '@/types/assignment.types';

interface LocationAssignmentsTabProps {
  locationId: string;
  locationName: string;
}

export default function LocationAssignmentsTab({
  locationId,
  locationName,
}: LocationAssignmentsTabProps) {
  const [assignments, setAssignments] = useState<AssignmentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Not authenticated');
      }

      const token = await user.getIdToken();

      const response = await fetch(`/api/admin/locations/${locationId}/assignments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load assignments');
      }

      const data = await response.json();
      setAssignments(data.assignments || []);
    } catch (err: any) {
      console.error('Error loading assignments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) {
      return;
    }

    try {
      setDeletingId(assignmentId);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Not authenticated');
      }

      const token = await user.getIdToken();

      const response = await fetch(
        `/api/admin/locations/${locationId}/assignments?assignmentId=${assignmentId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to remove assignment');
      }

      // Refresh assignments
      await loadAssignments();
    } catch (err: any) {
      console.error('Error removing assignment:', err);
      alert(`Failed to remove assignment: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Assigned Cleaners</h3>
          <p className="text-sm text-gray-600">
            Cleaners who can record videos at this location
          </p>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <UserPlus size={20} />
          Assign Cleaner
        </button>
      </div>

      {/* Assignments List */}
      {assignments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <UserPlus size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-2">No cleaners assigned yet</p>
          <p className="text-sm text-gray-500 mb-4">
            Assign a cleaner to allow them to record videos at this location
          </p>
          <button
            onClick={() => setShowAssignModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Assign First Cleaner
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cleaner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">
                        {assignment.user_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {assignment.user_email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                      {assignment.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {assignment.assigned_at ? new Date(assignment.assigned_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleRemoveAssignment(assignment.id)}
                      disabled={deletingId === assignment.id}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      title="Remove assignment"
                    >
                      {deletingId === assignment.id ? (
                        <Loader size={18} className="animate-spin" />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <AssignCleanerModal
          locationId={locationId}
          locationName={locationName}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            setShowAssignModal(false);
            loadAssignments();
          }}
        />
      )}
    </div>
  );
}

