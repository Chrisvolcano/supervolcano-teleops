/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Building2,
  Home,
  Target,
  Zap,
  ChevronRight,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  AddFloorModal,
  AddRoomModal,
  AddTargetModal,
  AddActionModal,
  AddToolModal,
} from './modals/LocationBuilderModals';

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

export default function LocationStructureTab({ locationId }: { locationId: string }) {
  const { getIdToken } = useAuth();

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
  const [showAddToolModal, setShowAddToolModal] = useState(false);
  
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);

  const loadLibrary = useCallback(async () => {
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
  }, [getIdToken]);

  const loadStructure = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getIdToken();
      if (!token) {
        console.error('[LocationStructureTab] No auth token');
        return;
      }

      console.log('[LocationStructureTab] Loading structure for location:', locationId);
      const response = await fetch(`/api/admin/locations/${locationId}/structure`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[LocationStructureTab] API error:', response.status, errorData);
        throw new Error(errorData.error || `Failed to load structure: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[LocationStructureTab] Structure data received:', {
        success: data.success,
        floorCount: data.structure?.floors?.length || 0,
        floors: data.structure?.floors,
      });

      if (data.success) {
        const floors = data.structure.floors || [];
        const roomsWithoutFloors = data.structure.roomsWithoutFloors || [];
        
        console.log('[LocationStructureTab] Setting floors:', floors.length);
        setFloors(floors);
        setRoomsWithoutFloors(roomsWithoutFloors);
        
        // Auto-expand first floor and first room
        if (floors.length > 0) {
          const firstFloor = floors[0];
          setExpandedFloors(new Set([firstFloor.id]));
          
          if (firstFloor.rooms && firstFloor.rooms.length > 0) {
            setExpandedRooms(new Set([firstFloor.rooms[0].id]));
          }
        }
      } else {
        console.error('[LocationStructureTab] API returned success=false:', data);
      }
    } catch (error) {
      console.error('[LocationStructureTab] Failed to load structure:', error);
    } finally {
      setLoading(false);
    }
  }, [locationId, getIdToken]);

  useEffect(() => {
    loadLibrary();
    loadStructure();
  }, [loadLibrary, loadStructure]);

  async function handleAddFloor(name: string) {
    try {
      setLoading(true);

      const token = await getIdToken();
      if (!token) {
        alert('Authentication required. Please log in again.');
        return;
      }

      console.log('[AddFloor] Submitting:', { name, locationId });

      const response = await fetch(`/api/admin/locations/${locationId}/floors`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      console.log('[AddFloor] Response status:', response.status);

      const data = await response.json();
      console.log('[AddFloor] Response data:', data);

      if (!response.ok) {
        // Show error to user
        throw new Error(data.error || `Failed to create floor: ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to create floor');
      }

      // SUCCESS - Show success message
      console.log('[AddFloor] Success! Created floor:', data.floor);
      
      // CRITICAL: Refetch the structure to update UI
      await loadStructure();
      
      // Close modal
      setShowAddFloorModal(false);
      
      // Optional: Show success message (you can replace with toast if you have one)
      console.log(`Floor "${name}" created successfully`);

    } catch (error: any) {
      console.error('[AddFloor] Error:', error);
      
      // Show error to user (don't just fail silently!)
      alert(`Failed to create floor: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddRoom(roomType: string, name: string) {
    try {
      setLoading(true);

      const token = await getIdToken();
      if (!token) {
        alert('Authentication required. Please log in again.');
        return;
      }

      if (!selectedFloorId) {
        alert('Please select a floor first');
        return;
      }

      console.log('[AddRoom] Submitting:', { roomType, name, floorId: selectedFloorId, locationId });

      // Use the nested endpoint: /api/admin/locations/[id]/floors/[floorId]/rooms
      const response = await fetch(
        `/api/admin/locations/${locationId}/floors/${selectedFloorId}/rooms`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: name,
            room_type: roomType,
          }),
        }
      );

      console.log('[AddRoom] Response status:', response.status);

      const data = await response.json();
      console.log('[AddRoom] Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || `Failed to create room: ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to create room');
      }

      // SUCCESS
      console.log('[AddRoom] Success! Created room:', data.room);
      
      // CRITICAL: Refetch the structure
      await loadStructure();
      
      // Close modal
      setShowAddRoomModal(false);
      setSelectedFloorId(null);
      
      // Optional: Show success message
      console.log(`Room "${customName || roomTypeId}" created successfully`);

    } catch (error: any) {
      console.error('[AddRoom] Error:', error);
      alert(`Failed to create room: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTarget(name: string, targetType: string) {
    if (!selectedRoomId) return;

    try {
      setLoading(true);
      setError(null);

      const token = await getIdToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      console.log('[AddTarget] Creating target:', { name, targetType, roomId: selectedRoomId });

      const response = await fetch(
        `/api/admin/locations/${locationId}/rooms/${selectedRoomId}/targets`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ name, target_type: targetType }),
        }
      );

      const data = await response.json();
      console.log('[AddTarget] Response:', data);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create target');
      }

      console.log('[AddTarget] Success! Created target:', data.target.id);

      // Refetch structure
      await loadStructure();

      // Close modal
      setShowAddTargetModal(false);
      setSelectedRoomId(null);

      // Show success message
      console.log(`Target "${name}" created successfully`);

    } catch (error: any) {
      console.error('[AddTarget] Error:', error);
      setError(error.message);
      alert(`Failed to create target: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAction(name: string, description?: string) {
    if (!selectedTargetId) return;

    try {
      setLoading(true);
      setError(null);

      const token = await getIdToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      console.log('[AddAction] Creating action:', { name, description, targetId: selectedTargetId });

      const response = await fetch(
        `/api/admin/locations/${locationId}/targets/${selectedTargetId}/actions`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ name, description }),
        }
      );

      const data = await response.json();
      console.log('[AddAction] Response:', data);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create action');
      }

      console.log('[AddAction] Success! Created action:', data.action.id);

      // Refetch structure
      await loadStructure();

      // Close modal
      setShowAddActionModal(false);
      setSelectedTargetId(null);

      // Show success message
      console.log(`Action "${name}" created successfully`);

    } catch (error: any) {
      console.error('[AddAction] Error:', error);
      setError(error.message);
      alert(`Failed to create action: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTool(toolName: string) {
    if (!selectedActionId) return;

    try {
      setLoading(true);
      setError(null);

      const token = await getIdToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      console.log('[AddTool] Adding tool:', { toolName, actionId: selectedActionId });

      const response = await fetch(
        `/api/admin/locations/${locationId}/actions/${selectedActionId}/tools`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ tool_name: toolName }),
        }
      );

      const data = await response.json();
      console.log('[AddTool] Response:', data);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to add tool');
      }

      console.log('[AddTool] Success! Added tool:', data.tool.id);

      // Refetch structure
      await loadStructure();

      // Close modal
      setShowAddToolModal(false);
      setSelectedActionId(null);

      // Show success message
      console.log(`Tool "${toolName}" added successfully`);

    } catch (error: any) {
      console.error('[AddTool] Error:', error);
      setError(error.message);
      alert(`Failed to add tool: ${error.message}`);
    } finally {
      setLoading(false);
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
      } else {
        alert('Failed to generate tasks: ' + (data.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Failed to generate tasks:', error);
      alert('Failed to generate tasks: ' + (error.message || 'Unknown error'));
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading structure...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Location Structure</h3>
          <p className="text-sm text-gray-600 mt-1">
            Build your location structure, then generate tasks
          </p>
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
            disabled={generating || floors.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            {generating ? 'Generating...' : 'Generate Tasks'}
          </button>
        </div>
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
          <strong>Debug:</strong> Floors: {floors.length}, Rooms without floors: {roomsWithoutFloors.length}
        </div>
      )}

      {/* Structure Display */}
      {floors.length === 0 && roomsWithoutFloors.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
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
          {/* Display floors */}
          {floors.length > 0 && floors.map(floor => (
            <div key={floor.id} className="bg-white rounded-lg border border-gray-200">
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
                  <Building2 className="h-5 w-5 text-blue-600" />
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
                  <Plus className="h-4 w-4" />
                  Add Room
                </button>
              </button>

              {/* Rooms */}
              {expandedFloors.has(floor.id) && (
                <div className="border-t border-gray-200 p-4 space-y-3">
                  {floor.rooms.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No rooms yet. Click Add Room above.
                    </p>
                  ) : (
                    floor.rooms.map(room => (
                      <div key={room.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Home className="h-4 w-4" style={{ color: room.room_type_color }} />
                            <span className="font-medium text-gray-900">
                              {room.custom_name || room.room_type_name}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedRoomId(room.id);
                              setShowAddTargetModal(true);
                            }}
                            className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            + Target
                          </button>
                        </div>
                        {room.targets.length === 0 ? (
                          <p className="text-xs text-gray-500">No targets yet</p>
                        ) : (
                          <div className="space-y-2">
                            {room.targets.map(target => (
                              <div key={target.id} className="ml-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <Target className="h-3 w-3 text-purple-600" />
                                  <span>{target.custom_name || target.target_type_name}</span>
                                  <button
                                    onClick={() => {
                                      setSelectedTargetId(target.id);
                                      setShowAddActionModal(true);
                                    }}
                                    className="text-xs px-1.5 py-0.5 border border-gray-300 rounded"
                                  >
                                    + Action
                                  </button>
                                </div>
                                {target.actions.length > 0 && (
                                  <div className="ml-5 mt-1 space-y-1">
                                    {target.actions.map(action => (
                                      <div key={action.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                                        <Zap className="h-3 w-3 text-green-600" />
                                        <span>{action.action_type_name} ({action.default_duration}min)</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
          
          {/* Display rooms without floors */}
          {roomsWithoutFloors.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Rooms Without Floors</h4>
              <div className="space-y-2">
                {roomsWithoutFloors.map(room => (
                  <div key={room.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4" style={{ color: room.room_type_color }} />
                      <span className="font-medium text-gray-900">
                        {room.custom_name || room.room_type_name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddFloorModal && (
        <AddFloorModal
          onSubmit={handleAddFloor}
          onClose={() => setShowAddFloorModal(false)}
        />
      )}

      {showAddRoomModal && selectedFloorId && (
        <AddRoomModal
          floorId={selectedFloorId}
          onSubmit={(name, roomType) => handleAddRoom(roomType, name)}
          onClose={() => {
            setShowAddRoomModal(false);
            setSelectedFloorId(null);
          }}
        />
      )}

      {showAddTargetModal && selectedRoomId && (
        <AddTargetModal
          roomId={selectedRoomId}
          onSubmit={handleAddTarget}
          onClose={() => {
            setShowAddTargetModal(false);
            setSelectedRoomId(null);
          }}
        />
      )}

      {showAddActionModal && selectedTargetId && (
        <AddActionModal
          targetId={selectedTargetId}
          onSubmit={handleAddAction}
          onClose={() => {
            setShowAddActionModal(false);
            setSelectedTargetId(null);
          }}
        />
      )}

      {showAddToolModal && selectedActionId && (
        <AddToolModal
          actionId={selectedActionId}
          onSubmit={handleAddTool}
          onClose={() => {
            setShowAddToolModal(false);
            setSelectedActionId(null);
          }}
        />
      )}
    </div>
  );
}

// Old modal components removed - now using modals from ./modals/LocationBuilderModals.tsx
