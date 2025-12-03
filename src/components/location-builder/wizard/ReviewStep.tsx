/**
 * REVIEW STEP
 * Final review of location structure before completing wizard
 */

'use client';

import React from 'react';
import { Check, ChevronLeft, Clock, Key, Package, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewStepProps {
  wizard: any;
  onComplete: () => void;
}

export function ReviewStep({ wizard, onComplete }: ReviewStepProps) {
  const { state, getStats, goToPreviousStep, handleSave, goToStep } = wizard;
  const stats = getStats();

  const handleComplete = async () => {
    console.log('[ReviewStep] Complete Setup clicked');
    try {
      console.log('[ReviewStep] Saving...');
      await handleSave();
      console.log('[ReviewStep] Save complete, navigating to completion');
      goToStep('completion');
      console.log('[ReviewStep] goToStep called');
    } catch (error) {
      console.error('[ReviewStep] Failed to save:', error);
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          Review your location setup
        </h2>
        <p className="text-gray-500 mt-1">
          Review your configuration below
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{stats.floors}</p>
          <p className="text-sm text-gray-500">Floor{stats.floors !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{stats.rooms}</p>
          <p className="text-sm text-gray-500">Room{stats.rooms !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{stats.targets}</p>
          <p className="text-sm text-gray-500">Target{stats.targets !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{stats.actions}</p>
          <p className="text-sm text-gray-500">Action{stats.actions !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Estimated time */}
      <div className="flex items-center justify-center gap-2 mb-8 text-gray-600">
        <Clock className="w-5 h-5" />
        <span>Estimated completion time: <strong>{stats.estimatedMinutes} minutes</strong></span>
      </div>

      {/* Structure preview */}
      <div className="border border-gray-200 rounded-xl p-4 mb-8 max-h-64 overflow-y-auto">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Structure Preview</h3>
        <div className="space-y-4">
          {state.floors.map((floor: any) => (
            <div key={floor.id}>
              <p className="font-medium text-gray-900">{floor.name}</p>
              <div className="ml-4 space-y-2 mt-2">
                {floor.rooms.map((room: any) => (
                  <div key={room.id} className="flex items-start gap-2">
                    <span>{room.icon}</span>
                    <div>
                      <p className="text-sm text-gray-700">{room.name}</p>
                      <p className="text-xs text-gray-500">
                        {room.targets.length} targets, {room.targets.reduce((sum: number, t: any) => sum + t.actions.length, 0)} actions
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Intelligence Summary */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {/* Access Info */}
        {state.accessInfo?.entryMethod && (
          <div className="bg-blue-50 rounded-xl p-4">
            <h4 className="font-semibold text-blue-900 flex items-center gap-2">
              <Key className="h-5 w-5" /> Access Information
            </h4>
            <ul className="mt-2 text-sm text-blue-800 space-y-1">
              <li>Entry: {state.accessInfo.entryMethod}</li>
              {state.accessInfo.alarmCode && <li>Alarm: Configured ✓</li>}
              {state.accessInfo.wifiNetwork && <li>WiFi: {state.accessInfo.wifiNetwork}</li>}
              {state.accessInfo.emergencyContact?.name && <li>Emergency: {state.accessInfo.emergencyContact.name}</li>}
            </ul>
          </div>
        )}

        {/* Storage Map */}
        {state.storageLocations && state.storageLocations.length > 0 && (
          <div className="bg-purple-50 rounded-xl p-4">
            <h4 className="font-semibold text-purple-900 flex items-center gap-2">
              <Package className="h-5 w-5" /> Storage Map ({state.storageLocations.length} items)
            </h4>
            <ul className="mt-2 text-sm text-purple-800 space-y-1">
              {state.storageLocations.slice(0, 3).map((item: any) => (
                <li key={item.id}>• {item.itemType}: {item.location}</li>
              ))}
              {state.storageLocations.length > 3 && <li>+ {state.storageLocations.length - 3} more</li>}
            </ul>
          </div>
        )}

        {/* Preferences & Restrictions */}
        {((state.preferences && state.preferences.length > 0) || (state.restrictions && state.restrictions.length > 0)) && (
          <div className="bg-pink-50 rounded-xl p-4">
            <h4 className="font-semibold text-pink-900 flex items-center gap-2">
              <Heart className="h-5 w-5" /> Preferences & Restrictions
            </h4>
            <div className="mt-2 text-sm space-y-1">
              {state.preferences && state.preferences.filter((p: any) => p.priority === 'must').length > 0 && (
                <p className="text-red-700">⚠️ {state.preferences.filter((p: any) => p.priority === 'must').length} must-do items</p>
              )}
              {state.restrictions && state.restrictions.filter((r: any) => r.severity === 'critical').length > 0 && (
                <p className="text-red-700">🛑 {state.restrictions.filter((r: any) => r.severity === 'critical').length} critical restrictions</p>
              )}
              <p className="text-pink-700">
                {state.preferences?.length || 0} preferences, {state.restrictions?.length || 0} restrictions
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation is handled by LocationWizard parent component */}
    </div>
  );
}

