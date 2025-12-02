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
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {floor.name}
            </button>
          ))}
        </div>
      )}

      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        What rooms are on {currentFloor.name}?
      </h2>
      <p className="text-gray-500 mb-6">
        Tap to add rooms. Each room comes with default targets you can customize.
      </p>

      {/* Room template grid */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {ROOM_TEMPLATES.map((template) => (
          <button
            key={template.type}
            onClick={() => handleAddRoom(template)}
            className="p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all flex flex-col items-center"
          >
            <span className="text-2xl mb-1">{template.icon}</span>
            <span className="text-sm text-gray-700">{template.name}</span>
          </button>
        ))}
      </div>

      {/* Bulk add for common room types */}
      <div className="border-t border-gray-200 pt-4 mb-6">
        <p className="text-sm text-gray-500 mb-3">Need multiple of the same room?</p>
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
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
            <span className="text-sm text-gray-600">How many?</span>
            <select
              value={bulkCount}
              onChange={(e) => setBulkCount(parseInt(e.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-1"
            >
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <button
              onClick={handleBulkAdd}
              className="px-4 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              Add {bulkCount}
            </button>
          </div>
        )}
      </div>

      {/* Added rooms list */}
      {currentFloor.rooms.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Added to {currentFloor.name}:
          </h3>
          <div className="flex flex-wrap gap-2">
            {currentFloor.rooms.map((room: any) => (
              <div
                key={room.id}
                className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg"
              >
                <span>{room.icon}</span>
                <span className="text-sm text-green-800">{room.name}</span>
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
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button
          onClick={goToPreviousStep}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
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
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          )}
        >
          Continue
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

