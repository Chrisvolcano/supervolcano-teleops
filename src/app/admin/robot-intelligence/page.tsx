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
  X
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Stats {
  locations: number;
  shifts: number;
  moments: number;
  executions: number;
}

interface Moment {
  id: string;
  title: string;
  description: string;
  moment_type: string;
  action_verb: string;
  object_target?: string;
  room_location?: string;
  sequence_order: number;
  human_verified: boolean;
  task_title: string;
  location_name: string;
  tags?: string[];
  keywords?: string[];
  created_at: string;
}

export default function RobotIntelligencePage() {
  const router = useRouter();
  const { getIdToken, claims } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    momentType: '',
    humanVerified: undefined as boolean | undefined,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  
  useEffect(() => {
    loadStats();
    loadMoments();
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
  
  async function loadMoments() {
    setLoading(true);
    try {
      const token = await getIdToken();
      const params = new URLSearchParams();
      if (filters.momentType) params.append('momentType', filters.momentType);
      if (filters.humanVerified !== undefined) {
        params.append('humanVerified', filters.humanVerified.toString());
      }
      
      const response = await fetch(`/api/admin/moments?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMoments(data.moments);
      }
    } catch (error) {
      console.error('Failed to load moments:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function syncData() {
    setSyncing(true);
    try {
      const token = await getIdToken();
      const response = await fetch('/api/admin/sync', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`Data synced successfully!\n\nLocations: ${data.stats?.locations || 0}\nTasks: ${data.stats?.tasks || 0}\nShifts: ${data.stats?.shifts || 0}`);
        loadStats();
      } else {
        alert('Sync failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Sync failed. Check console for details.');
    } finally {
      setSyncing(false);
    }
  }
  
  async function deleteMoment(id: string) {
    if (!confirm('Are you sure you want to delete this moment?')) return;
    
    try {
      const token = await getIdToken();
      const response = await fetch(`/api/admin/moments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        loadMoments();
        loadStats();
      } else {
        const data = await response.json();
        alert('Failed to delete: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to delete moment:', error);
      alert('Failed to delete moment');
    }
  }
  
  async function handleApplyFilters() {
    await loadMoments();
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
            onClick={syncData}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync from Firestore'}
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Moment
          </button>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          label="Moments Created"
          value={stats?.moments || 0}
          icon={Sparkles}
          color="green"
        />
        <StatCard
          label="Robot Executions"
          value={stats?.executions || 0}
          icon={Database}
          color="orange"
        />
      </div>
      
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={filters.momentType}
            onChange={(e) => setFilters({...filters, momentType: e.target.value})}
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
          
          {(filters.momentType || filters.humanVerified !== undefined) && (
            <button
              onClick={() => {
                setFilters({ momentType: '', humanVerified: undefined });
                setTimeout(loadMoments, 100);
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
      
      {/* Moments List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Moments ({moments.length})
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-gray-400" />
              Loading moments...
            </div>
          ) : moments.length === 0 ? (
            <div className="p-12 text-center">
              <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">
                No moments yet. Create your first moment to start building the robot database.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create First Moment
              </button>
            </div>
          ) : (
            moments.map((moment) => (
              <div key={moment.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {moment.human_verified ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                      <h4 className="font-semibold text-gray-900">
                        {moment.title}
                      </h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        moment.moment_type === 'action' ? 'bg-blue-100 text-blue-800' :
                        moment.moment_type === 'observation' ? 'bg-green-100 text-green-800' :
                        moment.moment_type === 'decision' ? 'bg-purple-100 text-purple-800' :
                        moment.moment_type === 'navigation' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {moment.moment_type}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      {moment.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                      <span>Task: {moment.task_title}</span>
                      <span>•</span>
                      <span>Location: {moment.location_name}</span>
                      <span>•</span>
                      <span>Action: {moment.action_verb}</span>
                      {moment.object_target && (
                        <>
                          <span>•</span>
                          <span>Target: {moment.object_target}</span>
                        </>
                      )}
                      {moment.room_location && (
                        <>
                          <span>•</span>
                          <span>Room: {moment.room_location}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>Sequence: #{moment.sequence_order}</span>
                    </div>
                    
                    {moment.tags && moment.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {moment.tags.map((tag: string, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/admin/robot-intelligence/moments/${moment.id}`)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      aria-label="Edit moment"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteMoment(moment.id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Delete moment"
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
      
      {/* Create Modal - Placeholder */}
      {showCreateModal && (
        <CreateMomentModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadMoments();
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

function CreateMomentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { getIdToken, claims } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    locationId: '',
    taskId: '',
    title: '',
    description: '',
    momentType: 'action' as 'action' | 'observation' | 'decision' | 'navigation' | 'manipulation',
    actionVerb: '',
    objectTarget: '',
    roomLocation: '',
    sequenceOrder: 1,
    estimatedDurationSeconds: 60,
    tags: '',
    keywords: '',
    humanVerified: false,
  });
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = await getIdToken();
      
      // Get organization ID from claims
      const organizationId = (claims as any)?.organizationId || 'system';
      
      const response = await fetch('/api/admin/moments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          locationId: formData.locationId,
          taskId: formData.taskId,
          title: formData.title,
          description: formData.description,
          momentType: formData.momentType,
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
        alert('Failed to create moment: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to create moment:', error);
      alert('Failed to create moment');
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">
            Create Moment
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
                Location ID *
              </label>
              <input
                type="text"
                value={formData.locationId}
                onChange={(e) => setFormData({...formData, locationId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task ID *
              </label>
              <input
                type="text"
                value={formData.taskId}
                onChange={(e) => setFormData({...formData, taskId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
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
                Moment Type *
              </label>
              <select
                value={formData.momentType}
                onChange={(e) => setFormData({...formData, momentType: e.target.value as any})}
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
