/**
 * STEP 2: BUILD STRUCTURE
 * Add floors, rooms, and targets
 * Last updated: 2025-11-26
 */

import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { Floor, Room, Target, RoomType } from '@/types/location-builder.types';

interface Step2BuildStructureProps {
  floors: Floor[];
  addFloor: () => void;
  updateFloorName: (tempId: string, name: string) => void;
  deleteFloor: (tempId: string) => void;
  addRoom: (floorTempId: string) => void;
  updateRoom: (floorTempId: string, roomTempId: string, updates: Partial<Room>) => void;
  deleteRoom: (floorTempId: string, roomTempId: string) => void;
  addTarget: (floorTempId: string, roomTempId: string) => void;
  updateTarget: (floorTempId: string, roomTempId: string, targetTempId: string, updates: Partial<Target>) => void;
  deleteTarget: (floorTempId: string, roomTempId: string, targetTempId: string) => void;
}

export default function Step2BuildStructure(props: Step2BuildStructureProps) {
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());

  const toggleFloor = (tempId: string) => {
    setExpandedFloors(prev => {
      const next = new Set(prev);
      if (next.has(tempId)) {
        next.delete(tempId);
      } else {
        next.add(tempId);
      }
      return next;
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-2">Build Location Structure</h3>
        <p className="text-gray-600">
          Add floors, rooms, and targets. You can always add more later.
        </p>
      </div>

      {/* Add Floor Button */}
      <button
        onClick={props.addFloor}
        className="mb-6 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center gap-2 font-medium shadow-sm"
      >
        <Plus size={20} />
        Add Floor
      </button>

      {/* Floors List */}
      {props.floors.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 mb-2">No floors yet</p>
          <p className="text-sm text-gray-400">Click &quot;Add Floor&quot; to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {props.floors.map((floor) => (
            <FloorBuilder
              key={floor.tempId}
              floor={floor}
              isExpanded={expandedFloors.has(floor.tempId!)}
              onToggle={() => toggleFloor(floor.tempId!)}
              onUpdateName={(name) => props.updateFloorName(floor.tempId!, name)}
              onDelete={() => props.deleteFloor(floor.tempId!)}
              onAddRoom={() => props.addRoom(floor.tempId!)}
              onUpdateRoom={(roomTempId, updates) => props.updateRoom(floor.tempId!, roomTempId, updates)}
              onDeleteRoom={(roomTempId) => props.deleteRoom(floor.tempId!, roomTempId)}
              onAddTarget={(roomTempId) => props.addTarget(floor.tempId!, roomTempId)}
              onUpdateTarget={(roomTempId, targetTempId, updates) => 
                props.updateTarget(floor.tempId!, roomTempId, targetTempId, updates)
              }
              onDeleteTarget={(roomTempId, targetTempId) => 
                props.deleteTarget(floor.tempId!, roomTempId, targetTempId)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Floor Builder Component
interface FloorBuilderProps {
  floor: Floor;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdateName: (name: string) => void;
  onDelete: () => void;
  onAddRoom: () => void;
  onUpdateRoom: (roomTempId: string, updates: Partial<Room>) => void;
  onDeleteRoom: (roomTempId: string) => void;
  onAddTarget: (roomTempId: string) => void;
  onUpdateTarget: (roomTempId: string, targetTempId: string, updates: Partial<Target>) => void;
  onDeleteTarget: (roomTempId: string, targetTempId: string) => void;
}

function FloorBuilder({
  floor,
  isExpanded,
  onToggle,
  onUpdateName,
  onDelete,
  onAddRoom,
  onUpdateRoom,
  onDeleteRoom,
  onAddTarget,
  onUpdateTarget,
  onDeleteTarget,
}: FloorBuilderProps) {
  const roomTypes: { value: RoomType; label: string }[] = [
    { value: 'kitchen', label: 'Kitchen' },
    { value: 'bathroom', label: 'Bathroom' },
    { value: 'bedroom', label: 'Bedroom' },
    { value: 'living_room', label: 'Living Room' },
    { value: 'dining_room', label: 'Dining Room' },
    { value: 'office', label: 'Office' },
    { value: 'laundry', label: 'Laundry' },
    { value: 'garage', label: 'Garage' },
    { value: 'hallway', label: 'Hallway' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Floor Header */}
      <div className="bg-gray-50 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className="text-gray-600 hover:text-gray-900"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse floor' : 'Expand floor'}
          >
            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
          <input
            type="text"
            value={floor.name}
            onChange={(e) => onUpdateName(e.target.value)}
            placeholder="Floor name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
          <span className="text-sm text-gray-500 whitespace-nowrap">
            {floor.rooms.length} room{floor.rooms.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
            aria-label="Delete floor"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Floor Content */}
      {isExpanded && (
        <div className="p-4 bg-white">
          <button
            onClick={onAddRoom}
            className="mb-3 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Plus size={16} />
            Add Room
          </button>

          {floor.rooms.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No rooms yet. Click &quot;Add Room&quot; to start.</p>
          ) : (
            <div className="space-y-3">
              {floor.rooms.map((room) => (
                <div key={room.tempId} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  {/* Room Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      placeholder="Room name (e.g., Master Bedroom)"
                      value={room.name}
                      onChange={(e) => onUpdateRoom(room.tempId!, { name: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <select
                        value={room.type}
                        onChange={(e) => onUpdateRoom(room.tempId!, { type: e.target.value as RoomType })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {roomTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => onDeleteRoom(room.tempId!)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        aria-label="Delete room"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Add Target Button */}
                  <button
                    onClick={() => onAddTarget(room.tempId!)}
                    className="mb-2 px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Add Target
                  </button>

                  {/* Targets */}
                  {room.targets.length > 0 && (
                    <div className="space-y-2 pl-4">
                      {room.targets.map((target) => (
                        <div key={target.tempId} className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Target name (e.g., Counter, Sink)"
                            value={target.name}
                            onChange={(e) => onUpdateTarget(room.tempId!, target.tempId!, { name: e.target.value })}
                            className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => onDeleteTarget(room.tempId!, target.tempId!)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            aria-label="Delete target"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

