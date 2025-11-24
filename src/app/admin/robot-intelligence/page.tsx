'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Database, 
  RefreshCw, 
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Circle,
  Edit,
  Trash2,
  Sparkles,
  Loader2,
  X,
  Video
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Stats {
  locations: number;
  shifts: number;
  tasks: number;
  executions: number;
  media: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  task_type: string;
  action_verb: string;
  object_target?: string;
  room_location?: string;
  sequence_order: number;
  human_verified: boolean;
  job_title: string;
  location_name: string;
  tags?: string[];
  keywords?: string[];
  created_at: string;
  media?: Array<{
    mediaId: string;
    mediaType: string;
    storageUrl: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
    role?: string;
  }>;
}

export default function RobotIntelligencePage() {
  const router = useRouter();
  const { getIdToken, claims } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [forceSyncing, setForceSyncing] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [settingUp, setSettingUp] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    taskType: '', // Changed from momentType
    humanVerified: undefined as boolean | undefined,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  
  useEffect(() => {
    loadStats();
    loadTasks();
  }, []);
  
  async function loadStats() {
    try {
      const token = await getIdToken();
      const response = await fetch('/api/admin/robot-intelligence/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }
  
  async function loadTasks() {
    setLoading(true);
    try {
      const token = await getIdToken();
      const params = new URLSearchParams();
      if (filters.taskType) params.append('taskType', filters.taskType);
      if (filters.humanVerified !== undefined) {
        params.append('humanVerified', filters.humanVerified.toString());
      }
      
      const response = await fetch(`/api/admin/tasks?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleSetupDatabase() {
    try {
      setSettingUp(true);
      setError(null);
      console.log('🔧 Setting up database...');
      
      const token = await getIdToken();
      const response = await fetch('/api/admin/setup-database', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('Setup response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Setup failed');
      }

      alert('✅ Database setup complete!\n\nTables created: ' + (data.tables?.join(', ') || 'locations, jobs, media'));
      
    } catch (error: any) {
      console.error('❌ Setup error:', error);
      setError(error.message);
      alert(`Setup failed: ${error.message}`);
    } finally {
      setSettingUp(false);
    }
  }

  async function syncData() {
    setSyncing(true);
    setError(null);
    try {
      const token = await getIdToken();
      
      console.log('🔄 Starting sync...');
      console.log('API URL:', '/api/admin/sync/all');
      
      const response = await fetch('/api/admin/sync/all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Sync failed with status:', response.status);
        console.error('Error response:', errorText);
        let errorMessage = `Sync failed: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Sync response:', data);

      if (!data.success) {
        throw new Error(data.error || data.message || 'Sync failed');
      }

      // Show success message
      const errorCount = data.results?.errors?.length || 0;
      const message = `✅ Sync complete!\n\nLocations: ${data.results?.locations || 0}\nJobs: ${data.results?.jobs || 0}\nMedia: ${data.results?.media || 0}${errorCount > 0 ? `\n\n⚠️ Errors: ${errorCount}` : ''}`;
      alert(message);
      
      // Reload stats
      await loadStats();
      
    } catch (error: any) {
      console.error('❌ Sync error:', error);
      setError(error.message);
      alert(`Sync failed: ${error.message || 'Unknown error'}\n\nCheck console for details.`);
    } finally {
      setSyncing(false);
    }
  }
  
  async function forceMediaSync() {
    setForceSyncing(true);
    try {
      const token = await getIdToken();
      const response = await fetch('/api/admin/sync-media', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✓ Media sync complete!\n\nSynced: ${data.synced}\nFailed: ${data.failed}`);
        loadStats(); // Refresh stats
      } else {
        const errorMsg = data.errors?.length > 0 
          ? data.errors.join('\n')
          : data.error || 'Unknown error';
        alert(`Media sync failed:\n\n${errorMsg}`);
      }
    } catch (error: any) {
      console.error('Force media sync failed:', error);
      alert('Failed to sync media: ' + error.message);
    } finally {
      setForceSyncing(false);
    }
  }
  
  async function runMigration() {
    if (!confirm('This will add locationId field to all tasks that currently use propertyId. Continue?')) {
      return;
    }

    setMigrating(true);
    try {
      const token = await getIdToken();
      const response = await fetch('/api/admin/migrate-location-ids', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`✓ Migration complete!\n\nMigrated: ${data.migrated}\nSkipped: ${data.skipped}\nErrors: ${data.errors}`);
        // Reload stats after migration
        loadStats();
      } else {
        const data = await response.json();
        alert(`Migration failed:\n\n${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Migration failed:', error);
      alert('Failed to run migration: ' + error.message);
    } finally {
      setMigrating(false);
    }
  }

  async function deleteTask(id: string) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const token = await getIdToken();
      const response = await fetch(`/api/admin/tasks/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        loadTasks();
        loadStats();
      } else {
        const data = await response.json();
        alert('Failed to delete: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task');
    }
  }
  
  async function handleApplyFilters() {
    await loadTasks();
  }
  
  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Robot Intelligence Database
          </h1>
          <p className="text-gray-600">
            SQL-based visual job database for robot learning. Completely separate from the teleop portal.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleSetupDatabase}
            disabled={settingUp}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Database className={`h-4 w-4 ${settingUp ? 'animate-spin' : ''}`} />
            {settingUp ? 'Setting up...' : 'Setup Database'}
          </button>
          <button
            onClick={syncData}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync from Firestore'}
          </button>
          
          <button
            onClick={async () => {
              try {
                const token = await getIdToken();
                const response = await fetch('/api/admin/debug/media', {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                });
                const data = await response.json();
                console.log('Media Debug Report:', data);
                
                let message = `Media Debug Report:\n\n`;
                message += `Firestore: ${data.summary.firestoreCount} files\n`;
                message += `SQL: ${data.summary.sqlCount} files\n`;
                message += `Can Sync: ${data.summary.canSync}\n`;
                message += `Cannot Sync: ${data.summary.cannotSync}\n\n`;
                
                if (data.summary.cannotSync > 0) {
                  message += `Issues:\n`;
                  data.checks.filter((c: any) => !c.locationExists).forEach((c: any) => {
                    message += `- ${c.fileName}: ${c.issues.join(', ')}\n`;
                  });
                }
                
                message += `\nCheck browser console (F12) for full details.`;
                alert(message);
              } catch (error) {
                console.error('Debug failed:', error);
                alert('Failed to run debug. Check console.');
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 border border-orange-300 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <Database className="h-4 w-4" />
            Debug Media
          </button>

          <button
            onClick={async () => {
              try {
                const token = await getIdToken();
                const locationId = prompt('Enter location ID to debug (or leave empty for all):');
                const url = locationId 
                  ? `/api/admin/debug/tasks?locationId=${locationId}`
                  : '/api/admin/debug/tasks';
                const response = await fetch(url, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                });
                const data = await response.json();
                console.log('Tasks Debug Report:', data);
                
                let message = `Tasks Debug Report:\n\n`;
                message += `Total Tasks: ${data.summary.totalTasks}\n`;
                message += `Filtered: ${data.summary.filteredTasks}\n`;
                message += `Location ID: ${data.summary.locationId}\n\n`;
                message += `Tasks by Location:\n`;
                data.byLocation.forEach((loc: any) => {
                  message += `- ${loc.locationId}: ${loc.count} tasks\n`;
                });
                
                message += `\nCheck browser console (F12) for full details.`;
                alert(message);
              } catch (error) {
                console.error('Debug failed:', error);
                alert('Failed to run debug. Check console.');
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 border border-blue-300 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Database className="h-4 w-4" />
            Debug Tasks
          </button>
          
          <button
            onClick={forceMediaSync}
            disabled={forceSyncing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {forceSyncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Syncing Media...
              </>
            ) : (
              <>
                <Video className="h-4 w-4" />
                Force Media Sync
              </>
            )}
          </button>
          
          <button
            onClick={runMigration}
            disabled={migrating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {migrating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Migrating...
              </>
            ) : (
              <>
                <Database className="h-4 w-4" />
                Migrate propertyId → locationId
              </>
            )}
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Task
          </button>
        </div>
      </div>
      
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-blue-900 mb-2">How This Works</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>
            • <strong>Firestore</strong> is the source of truth for locations, jobs, and media metadata
          </p>
          <p>
            • <strong>Firebase Storage</strong> stores actual video/image files
          </p>
          <p>
            • <strong>SQL Database</strong> stores robot-specific data (tasks, preferences, execution logs) + synced copies
          </p>
          <p>
            • Click <strong>&quot;Sync from Firestore&quot;</strong> to copy locations/jobs/media to SQL for robot queries
          </p>
          <p>
            • <strong>Visual Job Database:</strong> Robots query tasks WITH videos showing how to perform them
          </p>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          label="Locations Synced"
          value={stats?.locations || 0}
          icon={Database}
          color="blue"
        />
        <StatCard
          label="Shifts Recorded"
          value={stats?.shifts || 0}
          icon={Database}
          color="purple"
        />
        <StatCard
          label="Tasks Created"
          value={stats?.tasks || 0}
          icon={Sparkles}
          color="green"
        />
        <StatCard
          label="Robot Executions"
          value={stats?.executions || 0}
          icon={Database}
          color="orange"
        />
        <StatCard
          label="Media Files"
          value={stats?.media || 0}
          icon={Video}
          color="purple"
        />
      </div>
      
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={filters.taskType}
            onChange={(e) => setFilters({...filters, taskType: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Types</option>
            <option value="action">Action</option>
            <option value="observation">Observation</option>
            <option value="decision">Decision</option>
            <option value="navigation">Navigation</option>
            <option value="manipulation">Manipulation</option>
          </select>
          
          <select
            value={filters.humanVerified === undefined ? '' : filters.humanVerified.toString()}
            onChange={(e) => setFilters({
              ...filters,
              humanVerified: e.target.value === '' ? undefined : e.target.value === 'true'
            })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Verification</option>
            <option value="true">Verified Only</option>
            <option value="false">Unverified Only</option>
          </select>
          
          <button
            onClick={handleApplyFilters}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Apply Filters
          </button>
          
          {(filters.taskType || filters.humanVerified !== undefined) && (
            <button
              onClick={() => {
                setFilters({ taskType: '', humanVerified: undefined });
                setTimeout(loadTasks, 100);
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
      
      {/* Tasks List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Tasks ({tasks.length})
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-gray-400" />
              Loading tasks...
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-12 text-center">
              <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">
                No tasks yet. Create your first task to start building the robot database.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create First Task
              </button>
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {task.human_verified ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                      <h4 className="font-semibold text-gray-900">
                        {task.title}
                      </h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        task.task_type === 'action' ? 'bg-blue-100 text-blue-800' :
                        task.task_type === 'observation' ? 'bg-green-100 text-green-800' :
                        task.task_type === 'decision' ? 'bg-purple-100 text-purple-800' :
                        task.task_type === 'navigation' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.task_type}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      {task.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                      <span>Job: {task.job_title}</span>
                      <span>•</span>
                      <span>Location: {task.location_name}</span>
                      <span>•</span>
                      <span>Action: {task.action_verb}</span>
                      {task.object_target && (
                        <>
                          <span>•</span>
                          <span>Target: {task.object_target}</span>
                        </>
                      )}
                      {task.room_location && (
                        <>
                          <span>•</span>
                          <span>Room: {task.room_location}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>Sequence: #{task.sequence_order}</span>
                    </div>
                    
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {task.tags.map((tag: string, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Media Display */}
                    {task.media && task.media.length > 0 && (
                      <div className="mt-3 flex items-center gap-2">
                        <Video className="h-4 w-4 text-purple-600" />
                        <span className="text-sm text-purple-600 font-medium">
                          {task.media.length} video{task.media.length > 1 ? 's' : ''} attached
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/admin/robot-intelligence/tasks/${task.id}`)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      aria-label="Edit task"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Delete task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Create Modal */}
      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadTasks();
            loadStats();
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
  };
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color] || colorClasses.blue}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function CreateTaskModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { getIdToken, claims } = useAuth();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [jobs, setJobs] = useState<Array<{ id: string; title: string }>>([]); // Changed from tasks to jobs
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(false); // Changed from loadingTasks
  const [formData, setFormData] = useState({
    locationId: '',
    jobId: '', // Changed from taskId
    title: '',
    description: '',
    taskType: 'action' as 'action' | 'observation' | 'decision' | 'navigation' | 'manipulation', // Changed from momentType
    actionVerb: '',
    objectTarget: '',
    roomLocation: '',
    sequenceOrder: 1,
    estimatedDurationSeconds: 60,
    tags: '',
    keywords: '',
    humanVerified: false,
  });
  
  useEffect(() => {
    loadLocations();
  }, []);
  
  useEffect(() => {
    if (formData.locationId) {
      loadJobs(formData.locationId);
    } else {
      setJobs([]);
      setFormData(prev => ({ ...prev, jobId: '' }));
    }
  }, [formData.locationId]);
  
  async function loadLocations() {
    try {
      const token = await getIdToken();
      const response = await fetch('/api/admin/robot-intelligence/locations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLocations(data.locations || []);
        }
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setLoadingLocations(false);
    }
  }
  
  async function loadJobs(locationId: string) {
    setLoadingJobs(true);
    try {
      const token = await getIdToken();
      // Load jobs from Firestore (they're stored as "tasks" in location subcollections)
      const response = await fetch(`/api/admin/locations/${locationId}/tasks/firestore`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setJobs(data.tasks || []); // Firestore returns "tasks" but they're actually jobs
        }
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  }
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = await getIdToken();
      
      // Get organization ID from claims
      const organizationId = (claims as any)?.organizationId || 'system';
      
      const response = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          locationId: formData.locationId,
          jobId: formData.jobId, // Changed from taskId
          title: formData.title,
          description: formData.description,
          taskType: formData.taskType, // Changed from momentType
          actionVerb: formData.actionVerb,
          objectTarget: formData.objectTarget || undefined,
          roomLocation: formData.roomLocation || undefined,
          sequenceOrder: formData.sequenceOrder,
          estimatedDurationSeconds: formData.estimatedDurationSeconds,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
          keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
          source: 'manual_entry',
          humanVerified: formData.humanVerified,
          createdBy: (claims as any)?.email || 'admin',
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        onSuccess();
      } else {
        alert('Failed to create task: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task');
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">
            Create Task
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              {loadingLocations ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                  Loading locations...
                </div>
              ) : (
                <select
                  value={formData.locationId}
                  onChange={(e) => setFormData({...formData, locationId: e.target.value, jobId: ''})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select a location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              )}
              {locations.length === 0 && !loadingLocations && (
                <p className="text-xs text-orange-600 mt-1">
                  No locations found. Sync from Firestore first.
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job *
              </label>
              {!formData.locationId ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                  Select a location first
                </div>
              ) : loadingJobs ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                  Loading jobs...
                </div>
              ) : (
                <select
                  value={formData.jobId}
                  onChange={(e) => setFormData({...formData, jobId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select a job</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              )}
              {jobs.length === 0 && formData.locationId && !loadingJobs && (
                <p className="text-xs text-orange-600 mt-1">
                  No jobs found for this location.
                </p>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Type *
              </label>
              <select
                value={formData.taskType}
                onChange={(e) => setFormData({...formData, taskType: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              >
                <option value="action">Action</option>
                <option value="observation">Observation</option>
                <option value="decision">Decision</option>
                <option value="navigation">Navigation</option>
                <option value="manipulation">Manipulation</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action Verb *
              </label>
              <input
                type="text"
                value={formData.actionVerb}
                onChange={(e) => setFormData({...formData, actionVerb: e.target.value})}
                placeholder="e.g., wipe, open, place"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Object Target
              </label>
              <input
                type="text"
                value={formData.objectTarget}
                onChange={(e) => setFormData({...formData, objectTarget: e.target.value})}
                placeholder="e.g., counter, fridge, towel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Room Location
              </label>
              <input
                type="text"
                value={formData.roomLocation}
                onChange={(e) => setFormData({...formData, roomLocation: e.target.value})}
                placeholder="e.g., kitchen, bedroom_1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sequence Order *
              </label>
              <input
                type="number"
                value={formData.sequenceOrder}
                onChange={(e) => setFormData({...formData, sequenceOrder: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
                min={1}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Duration (seconds)
              </label>
              <input
                type="number"
                value={formData.estimatedDurationSeconds}
                onChange={(e) => setFormData({...formData, estimatedDurationSeconds: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min={1}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
              placeholder="e.g., cleaning, kitchen, daily"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) => setFormData({...formData, keywords: e.target.value})}
              placeholder="e.g., counter, surface, cleaner"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="humanVerified"
              checked={formData.humanVerified}
              onChange={(e) => setFormData({...formData, humanVerified: e.target.checked})}
              className="w-4 h-4"
            />
            <label htmlFor="humanVerified" className="text-sm text-gray-700">
              Human Verified
            </label>
          </div>
          
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating...' : 'Create Moment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
