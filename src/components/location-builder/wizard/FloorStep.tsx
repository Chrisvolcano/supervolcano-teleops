/**
 * FLOOR STEP
 * Select number of floors in the location
 */

'use client';

import React, { useState } from 'react';
import { Building2, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloorStepProps {
  wizard: any; // Type from useLocationWizard
}

export function FloorStep({ wizard }: FloorStepProps) {
  const { state, setFloorCount } = wizard;
  const [customCount, setCustomCount] = useState(state.floors.length || 1);
  const [showCustom, setShowCustom] = useState(false);

  const presetOptions = [1, 2, 3];

  const handleSelect = (count: number) => {
    setFloorCount(count);
  };

  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/20 rounded-full mb-4">
          <Building2 className="w-8 h-8 text-orange-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          How many floors does this location have?
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          This helps organize rooms by level
        </p>
      </div>

      {/* Preset options */}
      <div className="flex justify-center gap-4 mb-6">
        {presetOptions.map((count) => (
          <button
            key={count}
            onClick={() => handleSelect(count)}
            className={cn(
              'w-20 h-20 rounded-xl border-2 flex flex-col items-center justify-center transition-all',
              state.floors.length === count
                ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                : 'border-gray-200 dark:border-[#2a2a2a] hover:border-gray-300 dark:hover:border-[#3a3a3a] text-gray-700 dark:text-gray-300'
            )}
          >
            <span className="text-2xl font-bold">{count}</span>
            <span className="text-xs text-gray-500">
              {count === 1 ? 'floor' : 'floors'}
            </span>
          </button>
        ))}
        
        {/* Custom option */}
        <button
          onClick={() => setShowCustom(true)}
          className={cn(
            'w-20 h-20 rounded-xl border-2 flex flex-col items-center justify-center transition-all',
            showCustom || state.floors.length > 3
              ? 'border-orange-500 bg-orange-500/10 text-orange-500'
              : 'border-gray-200 dark:border-[#2a2a2a] hover:border-gray-300 dark:hover:border-[#3a3a3a] text-gray-700 dark:text-gray-300'
          )}
        >
          <span className="text-2xl font-bold">4+</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">custom</span>
        </button>
      </div>

      {/* Custom count input */}
      {showCustom && (
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={() => setCustomCount(Math.max(1, customCount - 1))}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#1f1f1f] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] flex items-center justify-center"
          >
            <Minus className="w-5 h-5 text-gray-900 dark:text-white" />
          </button>
          <span className="text-3xl font-bold text-gray-900 dark:text-white w-16 text-center">
            {customCount}
          </span>
          <button
            onClick={() => setCustomCount(customCount + 1)}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#1f1f1f] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] flex items-center justify-center"
          >
            <Plus className="w-5 h-5 text-gray-900 dark:text-white" />
          </button>
          <button
            onClick={() => handleSelect(customCount)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Set
          </button>
        </div>
      )}

      {/* Continue hint */}
      {state.floors.length > 0 && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          Selected: {state.floors.length} floor{state.floors.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

