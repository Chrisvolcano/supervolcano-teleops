/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
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
          <h3 className="text-lg font-semibold text-gray-900">Tasks</h3>
          <button
            onClick={() => setWizardOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Task
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600 mb-4">No tasks yet.</p>
            <button
              onClick={() => setWizardOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create First Task
            </button>
          </div>
        ) : (
          tasks.map((task: any) => (
            <TaskCard key={task.id} task={task} onUpdate={loadTasks} />
          ))
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


