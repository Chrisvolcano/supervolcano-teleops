'use client';

import React, { useState } from 'react';
import { Heart, AlertOctagon, Plus, Trash2, Star, Shield } from 'lucide-react';
import { Preference, Restriction, PreferenceCategory, RestrictionSeverity } from '@/types/location-intelligence';

interface PreferencesStepProps {
  preferences: Preference[];
  restrictions: Restriction[];
  onPreferencesChange: (preferences: Preference[]) => void;
  onRestrictionsChange: (restrictions: Restriction[]) => void;
}

const PREF_PRESETS = [
  { category: 'arrangement' as const, text: 'Toilet paper facing OUT' },
  { category: 'arrangement' as const, text: 'Pillows: 2 large back, 2 small front' },
  { category: 'arrangement' as const, text: 'Towels folded in thirds' },
  { category: 'method' as const, text: 'Vacuum lines visible in carpet' },
  { category: 'products' as const, text: 'Use only eco-friendly products' },
];

const RESTRICTION_PRESETS = [
  { text: 'No bleach on marble surfaces', severity: 'critical' as const },
  { text: 'No ammonia-based cleaners (pets)', severity: 'critical' as const },
  { text: 'Do not enter home office', severity: 'warning' as const },
  { text: 'Do not move items on desk', severity: 'warning' as const },
];

export default function PreferencesStep({
  preferences, restrictions, onPreferencesChange, onRestrictionsChange
}: PreferencesStepProps) {
  const [tab, setTab] = useState<'preferences' | 'restrictions'>('preferences');
  const generateId = () => Math.random().toString(36).substring(2, 15);

  const addPreference = (category: PreferenceCategory, description = '') => {
    onPreferencesChange([...preferences, { id: generateId(), category, description, priority: 'preferred' }]);
  };

  const updatePreference = (id: string, updates: Partial<Preference>) => {
    onPreferencesChange(preferences.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const removePreference = (id: string) => {
    onPreferencesChange(preferences.filter(p => p.id !== id));
  };

  const addRestriction = (description = '', severity: RestrictionSeverity = 'warning') => {
    onRestrictionsChange([...restrictions, { id: generateId(), description, severity }]);
  };

  const updateRestriction = (id: string, updates: Partial<Restriction>) => {
    onRestrictionsChange(restrictions.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeRestriction = (id: string) => {
    onRestrictionsChange(restrictions.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mb-4">
          <Heart className="h-8 w-8 text-pink-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Preferences & Restrictions</h2>
        <p className="mt-2 text-gray-600">What makes this property unique?</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTab('preferences')}
          className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 ${
            tab === 'preferences' ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500'
          }`}
        >
          <Star className="h-4 w-4 inline mr-2" />
          Preferences ({preferences.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('restrictions')}
          className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 ${
            tab === 'restrictions' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500'
          }`}
        >
          <Shield className="h-4 w-4 inline mr-2" />
          Restrictions ({restrictions.length})
        </button>
      </div>

      {/* Preferences Tab */}
      {tab === 'preferences' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PREF_PRESETS.map((preset, i) => (
              <button
                key={i}
                type="button"
                onClick={() => addPreference(preset.category, preset.text)}
                className="px-3 py-1.5 text-sm bg-pink-50 text-pink-700 rounded-full hover:bg-pink-100"
              >
                + {preset.text}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => addPreference('other')}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-pink-300 flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" /> Add Custom Preference
          </button>

          {preferences.map((pref) => (
            <div key={pref.id} className="bg-white border rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-4">
                <input
                  type="text"
                  value={pref.description}
                  onChange={(e) => updatePreference(pref.id, { description: e.target.value })}
                  placeholder="Describe the preference..."
                  className="flex-1 px-3 py-2 border rounded-lg"
                />
                <button type="button" onClick={() => removePreference(pref.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={pref.priority === 'must'}
                    onChange={() => updatePreference(pref.id, { priority: 'must' })}
                  />
                  <span className="text-sm font-medium text-red-600">Must do</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={pref.priority === 'preferred'}
                    onChange={() => updatePreference(pref.id, { priority: 'preferred' })}
                  />
                  <span className="text-sm text-gray-600">Preferred</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Restrictions Tab */}
      {tab === 'restrictions' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {RESTRICTION_PRESETS.map((preset, i) => (
              <button
                key={i}
                type="button"
                onClick={() => addRestriction(preset.text, preset.severity)}
                className={`px-3 py-1.5 text-sm rounded-full ${
                  preset.severity === 'critical' 
                    ? 'bg-red-50 text-red-700 hover:bg-red-100'
                    : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                }`}
              >
                + {preset.text}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => addRestriction()}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-red-300 flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" /> Add Custom Restriction
          </button>

          {restrictions.map((r) => (
            <div 
              key={r.id} 
              className={`border rounded-xl p-4 space-y-3 ${
                r.severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
              }`}
            >
              <div className="flex items-start gap-4">
                <AlertOctagon className={`h-5 w-5 ${r.severity === 'critical' ? 'text-red-600' : 'text-yellow-600'}`} />
                <input
                  type="text"
                  value={r.description}
                  onChange={(e) => updateRestriction(r.id, { description: e.target.value })}
                  placeholder="What to avoid..."
                  className="flex-1 px-3 py-2 border rounded-lg bg-white"
                />
                <button 
                  type="button" 
                  onClick={() => removeRestriction(r.id)} 
                  className={`p-2 text-red-500 rounded-lg ${r.severity === 'critical' ? 'hover:bg-red-100' : 'hover:bg-red-50'}`}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              <div className="flex gap-4 ml-9">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={r.severity === 'critical'}
                    onChange={() => updateRestriction(r.id, { severity: 'critical' })}
                  />
                  <span className="text-sm font-medium text-red-600">Critical</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={r.severity === 'warning'}
                    onChange={() => updateRestriction(r.id, { severity: 'warning' })}
                  />
                  <span className="text-sm text-yellow-700">Warning</span>
                </label>
              </div>
              <input
                type="text"
                value={r.reason || ''}
                onChange={(e) => updateRestriction(r.id, { reason: e.target.value })}
                placeholder="Reason (optional)"
                className="w-full ml-9 px-3 py-2 text-sm border rounded-lg bg-white"
                style={{ width: 'calc(100% - 2.25rem)' }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

