/**
 * TARGET STEP
 * Review and customize targets for each room
 */

'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TargetStepProps {
  wizard: any;
}

export function TargetStep({ wizard }: TargetStepProps) {
  const { state, addTarget, removeTarget, goToNextStep, goToPreviousStep } = wizard;
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [addingToRoom, setAddingToRoom] = useState<string | null>(null);
  const [customTargetName, setCustomTargetName] = useState('');

  const allRooms = state.floors.flatMap((floor: any) => 
    floor.rooms.map((room: any) => ({ ...room, floorName: floor.name }))
  );

  const toggleRoom = (roomId: string) => {
    setExpandedRooms(prev => {
      const next = new Set(prev);
      if (next.has(roomId)) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });
  };

  const handleAddCustomTarget = (roomId: string) => {
    if (customTargetName.trim()) {
      addTarget(roomId, customTargetName.trim());
      setCustomTargetName('');
      setAddingToRoom(null);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Review targets in each room
      </h2>
      <p className="text-gray-500 mb-6">
        Each room has been pre-populated with common targets. You can add, remove, or customize.
      </p>

      {/* Room list with targets */}
      <div className="space-y-3 mb-6">
        {allRooms.map((room: any) => {
          const isExpanded = expandedRooms.has(room.id);
          
          return (
            <div
              key={room.id}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              {/* Room header */}
              <button
                onClick={() => toggleRoom(room.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{room.icon}</span>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{room.name}</p>
                    <p className="text-sm text-gray-500">{room.floorName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    {room.targets.length} target{room.targets.length !== 1 ? 's' : ''}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Targets list */}
              {isExpanded && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {room.targets.map((target: any) => (
                      <div
                        key={target.id}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg"
                      >
                        <span>{target.icon}</span>
                        <span className="text-sm">{target.name}</span>
                        <span className="text-xs text-gray-400">
                          ({target.actions.length} action{target.actions.length !== 1 ? 's' : ''})
                        </span>
                        <button
                          onClick={() => removeTarget(target.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add target */}
                  {addingToRoom === room.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customTargetName}
                        onChange={(e) => setCustomTargetName(e.target.value)}
                        placeholder="Target name..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddCustomTarget(room.id);
                          }
                          if (e.key === 'Escape') {
                            setAddingToRoom(null);
                            setCustomTargetName('');
                          }
                        }}
                      />
                      <button
                        onClick={() => handleAddCustomTarget(room.id)}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setAddingToRoom(null);
                          setCustomTargetName('');
                        }}
                        className="px-3 py-2 text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingToRoom(room.id)}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      Add target
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
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
          onClick={goToNextStep}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Continue to Review
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

