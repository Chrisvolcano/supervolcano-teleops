/**
 * ROOM STEP
 * Add rooms to each floor with templates
 */

'use client';

import React, { useState } from 'react';
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ROOM_TEMPLATES, RoomTemplate } from '@/lib/templates/location-templates';
import { cn } from '@/lib/utils';

interface RoomStepProps {
  wizard: any;
}

export function RoomStep({ wizard }: RoomStepProps) {
  const { state, addRoom, addBulkRooms, removeRoom, goToNextStep, goToPreviousStep, setCurrentFloor } = wizard;
  const [bulkMode, setBulkMode] = useState<string | null>(null);
  const [bulkCount, setBulkCount] = useState(2);

  const currentFloor = state.floors[state.currentFloorIndex];
  
  if (!currentFloor) {
    return <div>No floors set up yet</div>;
  }

  const handleAddRoom = (template: RoomTemplate) => {
    addRoom(currentFloor.id, template.type);
  };

  const handleBulkAdd = () => {
    if (bulkMode) {
      addBulkRooms(currentFloor.id, bulkMode, bulkCount);
      setBulkMode(null);
      setBulkCount(2);
    }
  };

  const handleRemoveRoom = (roomId: string) => {
    removeRoom(roomId);
  };

  return (
    <div>
      {/* Floor tabs */}
      {state.floors.length > 1 && (
        <div className="flex gap-2 mb-6">
          {state.floors.map((floor: any, index: number) => (
            <button
              key={floor.id}
              onClick={() => setCurrentFloor(index)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                index === state.currentFloorIndex
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-[#1f1f1f] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'
              )}
            >
              {floor.name}
            </button>
          ))}
        </div>
      )}

      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        What rooms are on {currentFloor.name}?
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Tap to add rooms. Each room comes with default targets you can customize.
      </p>

      {/* Room template grid */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {ROOM_TEMPLATES.map((template) => (
          <button
            key={template.type}
            onClick={() => handleAddRoom(template)}
            className="p-3 rounded-xl border border-gray-200 dark:border-[#2a2a2a] hover:border-orange-500 dark:hover:border-orange-500/50 hover:bg-orange-500/10 dark:hover:bg-orange-500/10 transition-all flex flex-col items-center"
          >
            <span className="text-2xl mb-1">{template.icon}</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">{template.name}</span>
          </button>
        ))}
      </div>

      {/* Bulk add for common room types */}
      <div className="border-t border-gray-200 dark:border-[#2a2a2a] pt-4 mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Need multiple of the same room?</p>
        <div className="flex gap-2">
          {['bedroom', 'bathroom'].map((type) => {
            const template = ROOM_TEMPLATES.find(r => r.type === type);
            if (!template) return null;
            
            return (
              <button
                key={type}
                onClick={() => setBulkMode(bulkMode === type ? null : type)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors',
                  bulkMode === type
                    ? 'bg-orange-500/20 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-500/30 dark:border-orange-500/30'
                    : 'bg-gray-100 dark:bg-[#1f1f1f] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'
                )}
              >
                <span>{template.icon}</span>
                Add multiple {template.name}s
              </button>
            );
          })}
        </div>
        
        {/* Bulk count picker */}
        {bulkMode && (
          <div className="flex items-center gap-3 mt-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">How many?</span>
            <select
              value={bulkCount}
              onChange={(e) => setBulkCount(parseInt(e.target.value))}
              className="rounded-lg border border-gray-300 dark:border-[#2a2a2a] px-3 py-1 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white"
            >
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <button
              onClick={handleBulkAdd}
              className="px-4 py-1 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
            >
              Add {bulkCount}
            </button>
          </div>
        )}
      </div>

      {/* Added rooms list */}
      {currentFloor.rooms.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Added to {currentFloor.name}:
          </h3>
          <div className="flex flex-wrap gap-2">
            {currentFloor.rooms.map((room: any) => (
              <div
                key={room.id}
                className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-500/20 border border-green-200 dark:border-green-500/30 rounded-lg"
              >
                <span>{room.icon}</span>
                <span className="text-sm text-green-800 dark:text-green-400">{room.name}</span>
                <button
                  onClick={() => handleRemoveRoom(room.id)}
                  className="text-green-600 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-[#2a2a2a]">
        <button
          onClick={goToPreviousStep}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={goToNextStep}
          disabled={currentFloor.rooms.length === 0}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg',
            currentFloor.rooms.length > 0
              ? 'bg-orange-500 text-white hover:bg-orange-600'
              : 'bg-gray-200 dark:bg-[#2a2a2a] text-gray-400 dark:text-gray-500 cursor-not-allowed'
          )}
        >
          Continue
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

