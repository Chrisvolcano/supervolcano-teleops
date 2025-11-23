'use client'

import { useState } from 'react';
import { Settings, Check, X, Edit2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface LocationPreferencesPanelProps {
  locationId: string;
  moments: any[];
  onUpdate: () => void;
}

export default function LocationPreferencesPanel({ 
  locationId, 
  moments, 
  onUpdate 
}: LocationPreferencesPanelProps) {
  const { getIdToken, claims } = useAuth();
  const [editingMoment, setEditingMoment] = useState<string | null>(null);
  const [customInstruction, setCustomInstruction] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Group moments by task
  const momentsByTask = moments.reduce((acc: any, moment) => {
    if (!acc[moment.task_id]) {
      acc[moment.task_id] = {
        taskTitle: moment.task_title,
        moments: [],
      };
    }
    acc[moment.task_id].moments.push(moment);
    return acc;
  }, {});
  
  async function savePreference(momentId: string) {
    if (!customInstruction.trim()) return;
    
    setSaving(true);
    try {
      const token = await getIdToken();
      const createdBy = (claims as any)?.email || 'unknown';
      
      const response = await fetch('/api/org/preferences', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          locationId,
          momentId,
          customInstruction: customInstruction.trim(),
          createdBy,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setEditingMoment(null);
        setCustomInstruction('');
        onUpdate();
      } else {
        alert('Failed to save preference: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to save preference:', error);
      alert('Failed to save preference');
    } finally {
      setSaving(false);
    }
  }
  
  async function deletePreference(preferenceId: string) {
    if (!confirm('Remove this location preference?')) return;
    
    try {
      const token = await getIdToken();
      const response = await fetch('/api/org/preferences', {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ preferenceId }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        onUpdate();
      } else {
        alert('Failed to delete preference: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to delete preference:', error);
      alert('Failed to delete preference');
    }
  }
  
  function startEditing(moment: any) {
    setEditingMoment(moment.id);
    setCustomInstruction(moment.custom_instruction || '');
  }
  
  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-orange-900 mb-1">
              Location-Specific Customization
            </h4>
            <p className="text-sm text-orange-700">
              These preferences override default instructions for <strong>this location only</strong>. 
              For example: &quot;At this Airbnb, place clean towels on beds for guests, not in bathrooms.&quot;
            </p>
          </div>
        </div>
      </div>
      
      {/* Moments by Task */}
      {Object.entries(momentsByTask).map(([taskId, taskData]: [string, any]) => (
        <div key={taskId} className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">{taskData.taskTitle}</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {taskData.moments.map((moment: any) => (
              <div key={moment.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-semibold text-sm">
                    {moment.sequence_order}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {moment.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Default: {moment.description}
                    </p>
                    
                    {/* Existing Preference */}
                    {moment.custom_instruction && editingMoment !== moment.id && (
                      <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Settings className="h-4 w-4 text-orange-600" />
                              <span className="text-xs font-medium text-orange-900 uppercase">
                                Location Preference
                              </span>
                            </div>
                            <p className="text-sm text-orange-900">
                              {moment.custom_instruction}
                            </p>
                            {moment.preference_updated_at && (
                              <p className="text-xs text-orange-600 mt-1">
                                Last updated: {new Date(moment.preference_updated_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => startEditing(moment)}
                              className="p-1.5 text-orange-600 hover:bg-orange-100 rounded transition-colors"
                              aria-label="Edit preference"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deletePreference(moment.preference_id)}
                              className="p-1.5 text-orange-600 hover:bg-orange-100 rounded transition-colors"
                              aria-label="Delete preference"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Edit Mode */}
                    {editingMoment === moment.id && (
                      <div className="mt-3 space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Custom Instruction for This Location
                          </label>
                          <textarea
                            value={customInstruction}
                            onChange={(e) => setCustomInstruction(e.target.value)}
                            placeholder="e.g., At this location, place towels on beds in bedrooms for guests, not in bathrooms"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => savePreference(moment.id)}
                            disabled={saving || !customInstruction.trim()}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Check className="h-4 w-4" />
                            {saving ? 'Saving...' : 'Save Preference'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingMoment(null);
                              setCustomInstruction('');
                            }}
                            disabled={saving}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Add Preference Button */}
                    {!moment.custom_instruction && editingMoment !== moment.id && (
                      <button
                        onClick={() => startEditing(moment)}
                        className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        Customize for this location
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

