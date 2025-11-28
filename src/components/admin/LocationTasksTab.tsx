/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, CheckCircle, Clock, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import TaskCard from './TaskCard';
import ContextualTaskWizardModal from './ContextualTaskWizardModal';

interface LocationTasksTabProps {
  locationId: string;
  locationName?: string;
  partnerOrgId?: string;
}

export default function LocationTasksTab({ locationId, locationName, partnerOrgId }: LocationTasksTabProps) {
  const { getIdToken } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [filterFloor, setFilterFloor] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const loadTasks = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;

      const response = await fetch(`/api/admin/locations/${locationId}/tasks`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.success) {
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [locationId, getIdToken]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Get unique floors for filter
  const floors = useMemo(() => {
    const floorSet = new Set<string>();
    tasks.forEach(task => {
      if (task.floor_id && task.floor_name) {
        floorSet.add(JSON.stringify({ id: task.floor_id, name: task.floor_name }));
      }
    });
    return Array.from(floorSet).map(str => JSON.parse(str));
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (filterFloor !== 'all' && task.floor_id !== filterFloor) return false;
      if (filterStatus !== 'all' && task.status !== filterStatus) return false;
      return true;
    });
  }, [tasks, filterFloor, filterStatus]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading tasks...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
          <h3 className="text-lg font-semibold text-gray-900">Tasks</h3>
            <p className="text-sm text-gray-600 mt-1">
              All actions across all floors - edit and manage work items
            </p>
          </div>
          <button
            onClick={() => setWizardOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Task
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Floor
            </label>
            <select
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Floors</option>
              {floors.map(floor => (
                <option key={floor.id} value={floor.id}>
                  {floor.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="available">Available</option>
            </select>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <CheckCircle size={48} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">No Tasks Yet</h3>
            <p className="text-gray-600 mb-6">
              Create tasks from the Structure tab or use &quot;Generate Tasks&quot; button
            </p>
            <button
              onClick={() => setWizardOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create First Task
            </button>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600">No tasks match the selected filters.</p>
            <button
              onClick={() => {
                setFilterFloor('all');
                setFilterStatus('all');
              }}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task: any) => (
              <div key={task.id} className="bg-white rounded-lg border border-gray-200">
                <TaskCard task={task} onUpdate={loadTasks} />
              </div>
            ))}
          </div>
        )}
      </div>

      <ContextualTaskWizardModal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSuccess={() => {
          loadTasks();
          setWizardOpen(false);
        }}
        locationId={locationId}
        locationName={locationName}
        partnerOrgId={partnerOrgId}
      />
    </>
  );
}


