/**
 * REVIEW STEP
 * Final review of location structure before completing wizard
 */

'use client';

import React from 'react';
import { Check, ChevronLeft, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewStepProps {
  wizard: any;
  onComplete: () => void;
}

export function ReviewStep({ wizard, onComplete }: ReviewStepProps) {
  const { state, getStats, goToPreviousStep, handleSave } = wizard;
  const stats = getStats();

  const handleComplete = async () => {
    await handleSave();
    onComplete();
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

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button
          onClick={goToPreviousStep}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={handleComplete}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          <Check className="w-5 h-5" />
          Complete Setup
        </button>
      </div>
    </div>
  );
}

