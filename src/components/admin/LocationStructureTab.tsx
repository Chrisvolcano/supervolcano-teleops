/**
 * LOCATION STRUCTURE TAB
 * 
 * Complete working version - tested for TypeScript errors
 * 
 * Last updated: 2025-11-26
 */

import { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import {
  AddFloorModal,
  AddRoomModal,
  AddTargetModal,
  AddActionModal,
  AddToolModal,
} from './modals/LocationBuilderModals';

interface LocationStructureTabProps {
  locationId: string;
}

export default function LocationStructureTab({ locationId }: LocationStructureTabProps) {
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [structure, setStructure] = useState<any>(null);
  
  // Modal states
  const [showAddFloorModal, setShowAddFloorModal] = useState(false);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showAddTargetModal, setShowAddTargetModal] = useState(false);
  const [showAddActionModal, setShowAddActionModal] = useState(false);
  const [showAddToolModal, setShowAddToolModal] = useState(false);
  
  // Context for nested operations
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  // Load structure
  async function loadStructure() {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/locations/${locationId}/structure`);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load structure');
      }
      setStructure(data.structure);
    } catch (error: any) {
      console.error('[LoadStructure] Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStructure();
  }, [locationId]);

  // Floor handler
  async function handleAddFloor(name: string) {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/locations/${locationId}/floors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create floor');
      }
      await loadStructure();
      setShowAddFloorModal(false);
      alert(`Floor "${name}" created successfully`);
    } catch (error: any) {
      console.error('[AddFloor] Error:', error);
      setError(error.message);
      alert(`Failed to create floor: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Room handler
  async function handleAddRoom(name: string, roomType: string) {
    try {
      setLoading(true);
      setError(null);
      if (!selectedFloorId) {
        throw new Error('No floor selected');
      }
      const response = await fetch(
        `/api/admin/locations/${locationId}/floors/${selectedFloorId}/rooms`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, room_type: roomType }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create room');
      }
      await loadStructure();
      setShowAddRoomModal(false);
      setSelectedFloorId(null);
      alert(`Room "${name}" created successfully`);
    } catch (error: any) {
      console.error('[AddRoom] Error:', error);
      setError(error.message);
      alert(`Failed to create room: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Target handler
  async function handleAddTarget(name: string, targetType: string) {
    try {
      setLoading(true);
      setError(null);
      if (!selectedRoomId) {
        throw new Error('No room selected');
      }
      const response = await fetch(
        `/api/admin/locations/${locationId}/rooms/${selectedRoomId}/targets`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, target_type: targetType }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create target');
      }
      await loadStructure();
      setShowAddTargetModal(false);
      setSelectedRoomId(null);
      alert(`Target "${name}" created successfully`);
    } catch (error: any) {
      console.error('[AddTarget] Error:', error);
      setError(error.message);
      alert(`Failed to create target: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Action handler
  async function handleAddAction(name: string, description?: string) {
    try {
      setLoading(true);
      setError(null);
      if (!selectedTargetId) {
        throw new Error('No target selected');
      }
      const response = await fetch(
        `/api/admin/locations/${locationId}/targets/${selectedTargetId}/actions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create action');
      }
      await loadStructure();
      setShowAddActionModal(false);
      setSelectedTargetId(null);
      alert(`Action "${name}" created successfully`);
    } catch (error: any) {
      console.error('[AddAction] Error:', error);
      setError(error.message);
      alert(`Failed to create action: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Tool handler
  async function handleAddTool(toolName: string) {
    try {
      setLoading(true);
      setError(null);
      if (!selectedActionId) {
        throw new Error('No action selected');
      }
      const response = await fetch(
        `/api/admin/locations/${locationId}/actions/${selectedActionId}/tools`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool_name: toolName }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to add tool');
      }
      await loadStructure();
      setShowAddToolModal(false);
      setSelectedActionId(null);
      alert(`Tool "${toolName}" added successfully`);
    } catch (error: any) {
      console.error('[AddTool] Error:', error);
      setError(error.message);
      alert(`Failed to add tool: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !structure) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-500">Loading structure...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="mb-6">
        <button
          onClick={() => setShowAddFloorModal(true)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          <Plus size={20} />
          Add Floor
        </button>
      </div>

      {structure?.floors?.map((floor: any) => (
        <FloorCard
          key={floor.id}
          floor={floor}
          onAddRoom={(floorId) => {
            setSelectedFloorId(floorId);
            setShowAddRoomModal(true);
          }}
          onAddTarget={(roomId) => {
            setSelectedRoomId(roomId);
            setShowAddTargetModal(true);
          }}
          onAddAction={(targetId) => {
            setSelectedTargetId(targetId);
            setShowAddActionModal(true);
          }}
          onAddTool={(actionId) => {
            setSelectedActionId(actionId);
            setShowAddToolModal(true);
          }}
        />
      ))}

      {showAddFloorModal && (
        <AddFloorModal
          onSubmit={handleAddFloor}
          onClose={() => setShowAddFloorModal(false)}
        />
      )}

      {showAddRoomModal && selectedFloorId && (
        <AddRoomModal
          floorId={selectedFloorId}
          onSubmit={handleAddRoom}
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

// FloorCard component
function FloorCard({ floor, onAddRoom, onAddTarget, onAddAction, onAddTool }: any) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mb-4 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between p-4 bg-gray-50">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
          <h3 className="font-semibold">{floor.name}</h3>
          <span className="text-sm text-gray-500">
            ({floor.rooms?.length || 0} rooms)
          </span>
        </div>
        <button
          onClick={() => onAddRoom(floor.id)}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
        >
          + Add Room
        </button>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-3">
          {floor.rooms?.map((room: any) => (
            <RoomCard
              key={room.id}
              room={room}
              onAddTarget={onAddTarget}
              onAddAction={onAddAction}
              onAddTool={onAddTool}
            />
          ))}
          {(!floor.rooms || floor.rooms.length === 0) && (
            <p className="text-gray-500 text-sm">No rooms yet</p>
          )}
        </div>
      )}
    </div>
  );
}

// RoomCard component
function RoomCard({ room, onAddTarget, onAddAction, onAddTool }: any) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="ml-6 border border-gray-200 rounded">
      <div className="flex items-center justify-between p-3 bg-white">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
          <span className="font-medium">{room.name}</span>
          <span className="text-xs text-gray-500 capitalize">({room.room_type})</span>
        </div>
        <button
          onClick={() => onAddTarget(room.id)}
          className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
        >
          + Target
        </button>
      </div>

      {isExpanded && (
        <div className="p-3 bg-gray-50 space-y-2">
          {room.targets?.map((target: any) => (
            <TargetCard
              key={target.id}
              target={target}
              onAddAction={onAddAction}
              onAddTool={onAddTool}
            />
          ))}
          {(!room.targets || room.targets.length === 0) && (
            <p className="text-gray-500 text-xs">No targets yet</p>
          )}
        </div>
      )}
    </div>
  );
}

// TargetCard component
function TargetCard({ target, onAddAction, onAddTool }: any) {
  return (
    <div className="ml-6 p-2 bg-white border border-gray-200 rounded">
      <div className="flex items-center justify-between">
        <span className="text-sm">{target.name}</span>
        <button
          onClick={() => onAddAction(target.id)}
          className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
        >
          + Action
        </button>
      </div>

      {target.actions?.map((action: any) => (
        <ActionCard key={action.id} action={action} onAddTool={onAddTool} />
      ))}
    </div>
  );
}

// ActionCard component
function ActionCard({ action, onAddTool }: any) {
  return (
    <div className="ml-4 mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs">
      <div className="flex items-center justify-between">
        <span>{action.name}</span>
        <button
          onClick={() => onAddTool(action.id)}
          className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
        >
          + Tool
        </button>
      </div>

      {action.tools?.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {action.tools.map((tool: any) => (
            <span key={tool.id} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
              {tool.tool_name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
