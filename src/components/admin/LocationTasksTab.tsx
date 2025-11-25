/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import TaskCard from './TaskCard';

export default function LocationTasksTab({ locationId }: { locationId: string }) {
  const { getIdToken } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="space-y-4">
      {tasks.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-600">No tasks yet. Build the location structure and generate tasks.</p>
        </div>
      ) : (
        tasks.map((task: any) => (
          <TaskCard key={task.id} task={task} onUpdate={loadTasks} />
        ))
      )}
    </div>
  );
}


