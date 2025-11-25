/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  MapPin, 
  Building2, 
  Phone, 
  Mail,
  ArrowLeft,
  Settings,
  Loader2,
  Sparkles
} from 'lucide-react';
import LocationPreferencesPanel from '@/components/admin/LocationPreferencesPanel';
import TaskCard from '@/components/admin/TaskCard';
import TaskFormModal from '@/components/admin/TaskFormModal';
import { TaskDetailsModal } from '@/components/admin/TaskDetailsModal';
import { useAuth } from '@/hooks/useAuth';
import { Plus, ClipboardList } from 'lucide-react';

export default function AdminLocationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { getIdToken } = useAuth();
  const locationId = params.id as string;
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPreferences, setShowPreferences] = useState(false);
  const [tasksForPreferences, setTasksForPreferences] = useState<any[]>([]);
  const [loadingTasksForPreferences, setLoadingTasksForPreferences] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  
  useEffect(() => {
    loadLocation();
    loadTasks();
  }, [locationId]);
  
  async function loadLocation() {
    try {
      const token = await getIdToken();
      if (!token) return;

      // Load from Firestore (source of truth)
      const response = await fetch(`/api/admin/locations/${locationId}/firestore`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLocation(data.location);
      }
    } catch (error) {
      console.error('Failed to load location:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function loadTasksForPreferences() {
    setLoadingTasksForPreferences(true);
    try {
      const token = await getIdToken();
      if (!token) return;

      // Load tasks (atomic robot steps) for preferences
      const response = await fetch(`/api/admin/tasks?locationId=${locationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      if (data.success) {
        setTasksForPreferences(data.tasks);
      }
    } catch (error) {
      console.error('Failed to load tasks for preferences:', error);
    } finally {
      setLoadingTasksForPreferences(false);
    }
  }
  
  async function loadTasks() {
    setLoadingTasks(true);
    try {
      console.log('🔍 LOCATION PAGE: Loading tasks for location:', locationId);
      
      const token = await getIdToken();
      if (!token) {
        console.error('❌ LOCATION PAGE: No auth token');
        return;
      }

      // Load tasks from Firestore (source of truth)
      // Try simpler endpoint first, fall back to firestore endpoint if needed
      let response;
      let data;
      
      try {
        response = await fetch(`/api/admin/locations/${locationId}/tasks`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        console.log('🔍 LOCATION PAGE: Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
        
        data = await response.json();
      } catch (error: any) {
        console.warn('⚠️ LOCATION PAGE: Simple endpoint failed, trying firestore endpoint...', error);
        // Fallback to firestore endpoint
        response = await fetch(`/api/admin/locations/${locationId}/tasks/firestore`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error(`Firestore API returned ${response.status}`);
        }
        
        data = await response.json();
      }
      
      console.log('🔍 LOCATION PAGE: Tasks loaded:', {
        success: data.success,
        count: data.tasks?.length || 0,
        tasks: data.tasks?.map((t: any) => ({ id: t.id, title: t.title })),
      });
      
      if (data.success) {
        setTasks(data.tasks || []);
        console.log('✅ LOCATION PAGE: Tasks state updated with', data.tasks?.length || 0, 'tasks');
      } else {
        console.error('❌ LOCATION PAGE: API returned error:', data.error);
        setTasks([]);
      }
    } catch (error: any) {
      console.error('❌ LOCATION PAGE: Failed to load tasks:', error);
      console.error('❌ LOCATION PAGE: Error details:', {
        message: error.message,
        stack: error.stack,
      });
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  
  if (!location) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Location not found</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push('/admin/locations')}
        className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Locations
      </button>
      
      {/* Location Header */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <MapPin className="h-6 w-6 text-purple-600" />
            </div>
            
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                {location.name}
              </h1>
              <p className="text-sm text-gray-600 mb-4">{location.address}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm">
                  {(location.assignedOrganizationName || location.organization_name) && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{location.assignedOrganizationName || location.organization_name}</span>
                    </div>
                  )}
                  
                  {(location.contactPhone || location.contact_phone) && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{location.contactPhone || location.contact_phone}</span>
                    </div>
                  )}
                  
                  {(location.contactEmail || location.contact_email) && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{location.contactEmail || location.contact_email}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => router.push(`/admin/locations/${locationId}/builder`)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Sparkles className="h-4 w-4" />
                  Location Builder
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Location Preferences Section */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                Location SOPs & Customization
              </h2>
              <p className="text-sm text-gray-600">
                Customize how tasks are performed at this specific location
              </p>
            </div>
            <button
              onClick={() => {
                setShowPreferences(!showPreferences);
                if (!showPreferences && tasksForPreferences.length === 0) {
                  loadTasksForPreferences();
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
            >
              <Settings className="h-4 w-4" />
              {showPreferences ? 'Hide Customization' : 'Customize SOPs'}
            </button>
          </div>
        </div>
        
        {showPreferences && (
          <div className="p-6">
            {loadingTasksForPreferences ? (
              <div className="text-center py-8 text-gray-500">
                Loading customization options...
              </div>
            ) : tasksForPreferences.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-2">
                  No tasks available yet for this location.
                </p>
                <p className="text-sm text-gray-500">
                  Tasks are atomic robot-executable steps created in Robot Intelligence.
                </p>
              </div>
            ) : (
              <LocationPreferencesPanel
                locationId={locationId}
                tasks={tasksForPreferences}
                onUpdate={loadTasksForPreferences}
              />
            )}
          </div>
        )}
      </div>
      
      {/* Tasks Section */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                Tasks
              </h2>
              <p className="text-sm text-gray-600">
                Manage tasks at this location
              </p>
            </div>
            <button
              onClick={() => {
                setEditingTask(null);
                setShowTaskForm(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </button>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {loadingTasks ? (
            <div className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">No tasks yet at this location</p>
              <button
                onClick={() => setShowTaskForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add First Task
              </button>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={() => {
                  setEditingTask(task);
                  setShowTaskForm(true);
                }}
                onDelete={async () => {
                  if (confirm('Delete this task?')) {
                    try {
                      const token = await getIdToken();
                      if (!token) return;
                      
                      const response = await fetch(`/api/admin/tasks/${task.id}`, {
                        method: 'DELETE',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                        },
                      });
                      
                      if (response.ok) {
                        loadTasks();
                      } else {
                        alert('Failed to delete task');
                      }
                    } catch (error) {
                      console.error('Failed to delete task:', error);
                      alert('Failed to delete task');
                    }
                  }
                }}
                onViewMoments={() => router.push(`/admin/robot-intelligence?taskId=${task.id}`)}
                onClick={() => setSelectedTask(task)}
              />
            ))
          )}
        </div>
      </div>
      
      {/* Access Instructions */}
      {(location.accessInstructions || location.access_instructions) && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Access Instructions</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">
            {location.accessInstructions || location.access_instructions}
          </p>
        </div>
      )}
      
      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskFormModal
          locationId={locationId}
          locationName={location?.name}
          partnerOrgId={location?.assignedOrganizationId || location?.partnerOrgId}
          task={editingTask}
          onClose={() => {
            setShowTaskForm(false);
            setEditingTask(null);
          }}
          onSave={async () => {
            console.log('🔍 LOCATION PAGE: Task saved callback triggered');
            setShowTaskForm(false);
            setEditingTask(null);
            console.log('🔍 LOCATION PAGE: Reloading tasks...');
            await loadTasks();
            console.log('✅ LOCATION PAGE: Tasks reloaded after save');
          }}
        />
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
