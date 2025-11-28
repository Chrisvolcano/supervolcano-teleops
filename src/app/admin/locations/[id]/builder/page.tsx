/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Building2,
  Home,
  Target,
  Zap,
  Trash2,
  ChevronRight,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface RoomType {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface TargetType {
  id: string;
  name: string;
  icon: string;
}

interface ActionType {
  id: string;
  name: string;
  estimated_duration_minutes: number;
}

interface Floor {
  id: string;
  name: string;
  rooms: Room[];
}

interface Room {
  id: string;
  room_type_name: string;
  custom_name: string;
  room_type_icon: string;
  room_type_color: string;
  targets: TargetItem[];
}

interface TargetItem {
  id: string;
  target_type_name: string;
  custom_name: string;
  target_type_icon: string;
  actions: Action[];
}

interface Action {
  id: string;
  action_type_name: string;
  default_duration: number;
}

export default function LocationBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const { getIdToken } = useAuth();
  const locationId = params.id as string;

  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [targetTypes, setTargetTypes] = useState<TargetType[]>([]);
  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);

  const [floors, setFloors] = useState<Floor[]>([]);
  const [roomsWithoutFloors, setRoomsWithoutFloors] = useState<Room[]>([]);
  
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  // Modals
  const [showAddFloorModal, setShowAddFloorModal] = useState(false);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showAddTargetModal, setShowAddTargetModal] = useState(false);
  const [showAddActionModal, setShowAddActionModal] = useState(false);
  
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  useEffect(() => {
    loadLibrary();
    loadStructure();
  }, [locationId]);

  async function loadLibrary() {
    try {
      const token = await getIdToken();
      if (!token) return;

      const [roomTypesRes, targetTypesRes, actionTypesRes] = await Promise.all([
        fetch('/api/admin/library/room-types', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/admin/library/target-types', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/admin/library/action-types', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      const roomTypesData = await roomTypesRes.json();
      const targetTypesData = await targetTypesRes.json();
      const actionTypesData = await actionTypesRes.json();

      if (roomTypesData.success) setRoomTypes(roomTypesData.roomTypes);
      if (targetTypesData.success) setTargetTypes(targetTypesData.targetTypes);
      if (actionTypesData.success) setActionTypes(actionTypesData.actionTypes);
    } catch (error) {
      console.error('Failed to load library:', error);
    }
  }

  async function loadStructure() {
    try {
      const token = await getIdToken();
      if (!token) return;

      const response = await fetch(`/api/admin/locations/${locationId}/structure`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success) {
        setFloors(data.structure.floors);
        setRoomsWithoutFloors(data.structure.roomsWithoutFloors);
        
        // Auto-expand first floor and first room
        if (data.structure.floors.length > 0) {
          const firstFloor = data.structure.floors[0];
          setExpandedFloors(new Set([firstFloor.id]));
          
          if (firstFloor.rooms.length > 0) {
            setExpandedRooms(new Set([firstFloor.rooms[0].id]));
          }
        }
      }
    } catch (error) {
      console.error('Failed to load structure:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddFloor(name: string) {
    try {
      const token = await getIdToken();
      if (!token) {
        alert('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch(`/api/admin/locations/${locationId}/floors`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (data.success) {
        await loadStructure();
        setShowAddFloorModal(false);
      } else {
        // Handle specific error cases
        if (response.status === 409) {
          alert('A floor with this name already exists. Please use a different name like "Floor 2" or "Second Floor".');
        } else if (response.status === 401) {
          alert('Your session has expired. Please log in again.');
        } else if (response.status === 403) {
          alert('You do not have permission to add floors to this location.');
        } else {
          alert('Failed to add floor: ' + (data.error || 'Unknown error'));
        }
      }
    } catch (error: any) {
      console.error('Failed to add floor:', error);
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        alert('Network error. Please check your connection and try again.');
      } else {
        alert('Failed to add floor: ' + (error.message || 'Unknown error'));
      }
    }
  }

  async function handleAddRoom(roomTypeId: string, customName?: string) {
    try {
      const token = await getIdToken();
      if (!token) return;

      const response = await fetch(`/api/admin/locations/${locationId}/rooms`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          room_type_id: roomTypeId,
          floor_id: selectedFloorId,
          custom_name: customName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await loadStructure();
        setShowAddRoomModal(false);
      }
    } catch (error) {
      console.error('Failed to add room:', error);
    }
  }

  async function handleAddTarget(targetTypeId: string) {
    if (!selectedRoomId) return;

    try {
      const token = await getIdToken();
      if (!token) return;

      const response = await fetch(`/api/admin/rooms/${selectedRoomId}/targets`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ target_type_id: targetTypeId }),
      });

      const data = await response.json();

      if (data.success) {
        await loadStructure();
        setShowAddTargetModal(false);
      }
    } catch (error) {
      console.error('Failed to add target:', error);
    }
  }

  async function handleAddAction(actionTypeId: string) {
    if (!selectedTargetId) return;

    try {
      const token = await getIdToken();
      if (!token) return;

      const response = await fetch(`/api/admin/targets/${selectedTargetId}/actions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action_type_id: actionTypeId }),
      });

      const data = await response.json();

      if (data.success) {
        await loadStructure();
        setShowAddActionModal(false);
      }
    } catch (error) {
      console.error('Failed to add action:', error);
    }
  }

  async function handleGenerateTasks() {
    setGenerating(true);
    try {
      const token = await getIdToken();
      if (!token) return;

      const response = await fetch(`/api/admin/locations/${locationId}/generate-tasks`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Generated ${data.tasksCreated} tasks!`);
        router.push(`/admin/locations/${locationId}`);
      } else {
        alert('Failed to generate tasks: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to generate tasks:', error);
      alert('Failed to generate tasks');
    } finally {
      setGenerating(false);
    }
  }

  const toggleFloor = (floorId: string) => {
    const newSet = new Set(expandedFloors);
    if (newSet.has(floorId)) {
      newSet.delete(floorId);
    } else {
      newSet.add(floorId);
    }
    setExpandedFloors(newSet);
  };

  const toggleRoom = (roomId: string) => {
    const newSet = new Set(expandedRooms);
    if (newSet.has(roomId)) {
      newSet.delete(roomId);
    } else {
      newSet.add(roomId);
    }
    setExpandedRooms(newSet);
  };

  const toggleTarget = (targetId: string) => {
    const newSet = new Set(expandedTargets);
    if (newSet.has(targetId)) {
      newSet.delete(targetId);
    } else {
      newSet.add(targetId);
    }
    setExpandedTargets(newSet);
  };

  // Guard: Redirect if locationId is missing (after hooks are declared)
  if (!locationId || locationId === 'undefined' || locationId.includes('undefined')) {
    router.push('/admin/locations');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading location builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Location Builder
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Build your location structure, then generate tasks
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddFloorModal(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Floor
              </button>
              <button
                onClick={handleGenerateTasks}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                {generating ? 'Generating...' : 'Generate Tasks'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {floors.length === 0 && roomsWithoutFloors.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Start Building Your Location
            </h3>
            <p className="text-gray-600 mb-6">
              Add floors and rooms to create the structure of this location
            </p>
            <button
              onClick={() => setShowAddFloorModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add First Floor
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Floors */}
            {floors.map(floor => (
              <div key={floor.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {/* Floor Header */}
                <button
                  onClick={() => toggleFloor(floor.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedFloors.has(floor.id) ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                    <Building2 className="h-5 w-5 text-gray-600" />
                    <span className="font-semibold text-gray-900">{floor.name}</span>
                    <span className="text-sm text-gray-500">
                      ({floor.rooms.length} rooms)
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFloorId(floor.id);
                      setShowAddRoomModal(true);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-white"
                  >
                    <Plus className="h-3 w-3" />
                    Add Room
                  </button>
                </button>

                {/* Rooms */}
                {expandedFloors.has(floor.id) && (
                  <div className="border-t border-gray-200">
                    {floor.rooms.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        No rooms yet. Click 'Add Room' above.
                      </div>
                    ) : (
                      floor.rooms.map(room => (
                        <RoomCard
                          key={room.id}
                          room={room}
                          expanded={expandedRooms.has(room.id)}
                          onToggle={() => toggleRoom(room.id)}
                          onAddTarget={() => {
                            setSelectedRoomId(room.id);
                            setShowAddTargetModal(true);
                          }}
                          expandedTargets={expandedTargets}
                          onToggleTarget={toggleTarget}
                          onAddAction={(targetId) => {
                            setSelectedTargetId(targetId);
                            setShowAddActionModal(true);
                          }}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddFloorModal && (
        <AddFloorModal
          onClose={() => setShowAddFloorModal(false)}
          onAdd={handleAddFloor}
        />
      )}

      {showAddRoomModal && (
        <AddRoomModal
          roomTypes={roomTypes}
          onClose={() => setShowAddRoomModal(false)}
          onAdd={handleAddRoom}
        />
      )}

      {showAddTargetModal && (
        <AddTargetModal
          targetTypes={targetTypes}
          onClose={() => setShowAddTargetModal(false)}
          onAdd={handleAddTarget}
        />
      )}

      {showAddActionModal && (
        <AddActionModal
          actionTypes={actionTypes}
          onClose={() => setShowAddActionModal(false)}
          onAdd={handleAddAction}
        />
      )}
    </div>
  );
}

// Room Card Component
function RoomCard({
  room,
  expanded,
  onToggle,
  onAddTarget,
  expandedTargets,
  onToggleTarget,
  onAddAction,
}: {
  room: Room;
  expanded: boolean;
  onToggle: () => void;
  onAddTarget: () => void;
  expandedTargets: Set<string>;
  onToggleTarget: (targetId: string) => void;
  onAddAction: (targetId: string) => void;
}) {
  const roomName = room.custom_name || room.room_type_name;

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
          <Home className="h-4 w-4 text-gray-600" />
          <span className="font-medium text-gray-900">{roomName}</span>
          <span className="text-sm text-gray-500">
            ({room.targets.length} targets)
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddTarget();
          }}
          className="flex items-center gap-1.5 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-white"
        >
          <Plus className="h-3 w-3" />
          Add Target
        </button>
      </button>

      {expanded && (
        <div className="bg-gray-50 pl-8 pr-4 py-2">
          {room.targets.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No targets yet.
            </div>
          ) : (
            room.targets.map(target => (
              <TargetCard
                key={target.id}
                target={target}
                expanded={expandedTargets.has(target.id)}
                onToggle={() => onToggleTarget(target.id)}
                onAddAction={() => onAddAction(target.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Target Card Component
function TargetCard({
  target,
  expanded,
  onToggle,
  onAddAction,
}: {
  target: TargetItem;
  expanded: boolean;
  onToggle: () => void;
  onAddAction: () => void;
}) {
  const targetName = target.custom_name || target.target_type_name;

  return (
    <div className="border-b border-gray-200 last:border-b-0 py-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between hover:bg-gray-100 rounded p-2 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-3 w-3 text-gray-400" />
          ) : (
            <ChevronRight className="h-3 w-3 text-gray-400" />
          )}
          <Target className="h-3 w-3 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">{targetName}</span>
          <span className="text-xs text-gray-500">
            ({target.actions.length} actions)
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddAction();
          }}
          className="flex items-center gap-1 px-2 py-0.5 text-xs border border-gray-300 rounded hover:bg-white"
        >
          <Plus className="h-2 w-2" />
          Action
        </button>
      </button>

      {expanded && (
        <div className="pl-6 pr-2 py-2">
          {target.actions.length === 0 ? (
            <div className="p-2 text-center text-gray-500 text-xs">
              No actions yet.
            </div>
          ) : (
            target.actions.map(action => (
              <div
                key={action.id}
                className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200 mb-1"
              >
                <Zap className="h-3 w-3 text-yellow-500" />
                <span className="text-sm text-gray-700">{action.action_type_name}</span>
                <span className="text-xs text-gray-500 ml-auto">
                  ({action.default_duration}min)
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Add Floor Modal
function AddFloorModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    // Clear previous errors
    setError('');
    
    // Validate input
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Floor name cannot be empty');
      return;
    }
    
    setIsLoading(true);
    try {
      await onAdd(trimmedName);
    } catch (err: any) {
      // Error handling is done in parent component
      console.error('Error in AddFloorModal:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Floor</h3>
        <input
          type="text"
          value={name}
          onChange={e => {
            setName(e.target.value);
            setError(''); // Clear error when user types
          }}
          placeholder="e.g., 1st Floor, 2nd Floor, Basement"
          className={`w-full px-4 py-2 border rounded-lg mb-4 ${
            error ? 'border-red-300' : 'border-gray-300'
          }`}
          autoFocus
          onKeyDown={e => {
            if (e.key === 'Enter' && !isLoading && name.trim()) {
              handleAdd();
            }
          }}
          disabled={isLoading}
        />
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={isLoading || !name.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Adding...' : 'Add Floor'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Room Modal
function AddRoomModal({
  roomTypes,
  onClose,
  onAdd,
}: {
  roomTypes: RoomType[];
  onClose: () => void;
  onAdd: (roomTypeId: string, customName?: string) => void;
}) {
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState('');
  const [customName, setCustomName] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Add Room</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {roomTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedRoomTypeId(type.id)}
                className={`p-3 border-2 rounded-lg text-left transition-all ${
                  selectedRoomTypeId === type.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="font-medium">{type.name}</span>
              </button>
            ))}
          </div>

          <input
            type="text"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            placeholder="Custom name (optional)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
          />
        </div>
        <div className="p-6 border-t border-gray-200 flex items-center gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => selectedRoomTypeId && onAdd(selectedRoomTypeId, customName || undefined)}
            disabled={!selectedRoomTypeId}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Add Room
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Target Modal
function AddTargetModal({
  targetTypes,
  onClose,
  onAdd,
}: {
  targetTypes: TargetType[];
  onClose: () => void;
  onAdd: (targetTypeId: string) => void;
}) {
  const [selectedTargetTypeId, setSelectedTargetTypeId] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Add Target</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-3">
            {targetTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedTargetTypeId(type.id)}
                className={`p-3 border-2 rounded-lg text-left transition-all ${
                  selectedTargetTypeId === type.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="font-medium">{type.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex items-center gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => selectedTargetTypeId && onAdd(selectedTargetTypeId)}
            disabled={!selectedTargetTypeId}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Add Target
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Action Modal
function AddActionModal({
  actionTypes,
  onClose,
  onAdd,
}: {
  actionTypes: ActionType[];
  onClose: () => void;
  onAdd: (actionTypeId: string) => void;
}) {
  const [selectedActionTypeId, setSelectedActionTypeId] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Add Action</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-3">
            {actionTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedActionTypeId(type.id)}
                className={`p-3 border-2 rounded-lg text-left transition-all ${
                  selectedActionTypeId === type.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">{type.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {type.estimated_duration_minutes}min
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex items-center gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => selectedActionTypeId && onAdd(selectedActionTypeId)}
            disabled={!selectedActionTypeId}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Add Action
          </button>
        </div>
      </div>
    </div>
  );
}

