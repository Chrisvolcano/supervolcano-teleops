/**
 * LOCATION STRUCTURE TAB
 * Polished, professional UI for managing location structure
 * 
 * Last updated: 2025-01-27
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Building2, 
  LayoutGrid, 
  Target, 
  CheckCircle, 
  Clock,
  MoreVertical,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Lightbulb,
  Sparkles
} from 'lucide-react';
import { getAuth } from 'firebase/auth';
import {
  AddFloorModal,
  AddRoomModal,
  AddTargetModal,
  AddActionModal,
  AddToolModal,
} from './modals/LocationBuilderModals';

interface LocationStructureTabProps {
  locationId: string;
  onRunWizard?: () => void;
}

// Room type icon mapping
const ROOM_ICONS: Record<string, string> = {
  kitchen: '🍳',
  bathroom: '🚿',
  bedroom: '🛏️',
  living_room: '🛋️',
  dining_room: '🍽️',
  office: '💼',
  laundry: '🧺',
  garage: '🚗',
  patio: '🌿',
  entry: '🚪',
  hallway: '🚶',
  closet: '👕',
  default: '📦',
};

// Helper to get room icon
const getRoomIcon = (roomType?: string) => {
  if (!roomType) return ROOM_ICONS.default;
  return ROOM_ICONS[roomType.toLowerCase()] || ROOM_ICONS.default;
};

// Context Menu Component
interface ContextMenuProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

function ContextMenu({ 
  onEdit, 
  onDelete, 
  onMoveUp, 
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
}: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 hover:bg-gray-200 rounded transition-colors"
      >
        <MoreVertical className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {onEdit && (
            <button
              onClick={() => { onEdit(); setIsOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          )}
          {onMoveUp && canMoveUp && (
            <button
              onClick={() => { onMoveUp(); setIsOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <ArrowUp className="w-4 h-4" />
              Move Up
            </button>
          )}
          {onMoveDown && canMoveDown && (
            <button
              onClick={() => { onMoveDown(); setIsOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <ArrowDown className="w-4 h-4" />
              Move Down
            </button>
          )}
          {onDelete && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => { onDelete(); setIsOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function LocationStructureTab({ locationId, onRunWizard }: LocationStructureTabProps) {
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [structure, setStructure] = useState<any>(null);
  
  // Expand/collapse state
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  
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

  // Calculate structure stats
  const getStructureStats = (floors: any[]) => {
    let roomCount = 0;
    let targetCount = 0;
    let actionCount = 0;
    let totalMinutes = 0;

    floors?.forEach(floor => {
      roomCount += floor.rooms?.length || 0;
      floor.rooms?.forEach((room: any) => {
        targetCount += room.targets?.length || 0;
        room.targets?.forEach((target: any) => {
          actionCount += target.actions?.length || 0;
          target.actions?.forEach((action: any) => {
            totalMinutes += action.durationMinutes || 0;
          });
        });
      });
    });

    return {
      floors: floors?.length || 0,
      rooms: roomCount,
      targets: targetCount,
      actions: actionCount,
      totalMinutes,
    };
  };

  const stats = structure ? getStructureStats(structure) : { floors: 0, rooms: 0, targets: 0, actions: 0, totalMinutes: 0 };

  // Initialize all expanded by default
  useEffect(() => {
    if (structure) {
      const floorIds = new Set(structure.map((f: any) => f.id));
      const roomIds = new Set<string>();
      structure.forEach((f: any) => {
        f.rooms?.forEach((r: any) => roomIds.add(r.id));
      });
      setExpandedFloors(floorIds);
      setExpandedRooms(roomIds);
    }
  }, [structure]);

  // Toggle functions
  const toggleFloor = (floorId: string) => {
    setExpandedFloors(prev => {
      const next = new Set(prev);
      if (next.has(floorId)) {
        next.delete(floorId);
      } else {
        next.add(floorId);
      }
      return next;
    });
  };

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

  // Expand/collapse all
  const expandAll = () => {
    if (!structure) return;
    const floorIds = new Set(structure.map((f: any) => f.id));
    const roomIds = new Set<string>();
    structure.forEach((f: any) => {
      f.rooms?.forEach((r: any) => roomIds.add(r.id));
    });
    setExpandedFloors(floorIds);
    setExpandedRooms(roomIds);
  };

  const collapseAll = () => {
    setExpandedFloors(new Set());
    setExpandedRooms(new Set());
  };

  // Helper to get auth token
  async function getAuthToken(): Promise<string> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Not authenticated - please log in');
    }

    const token = await user.getIdToken();
    return token;
  }

  // Load structure
  async function loadStructure() {
    try {
      setLoading(true);
      setError(null);
      
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('Not authenticated - please log in');
      }

      const token = await user.getIdToken();

      const response = await fetch(`/api/admin/locations/${locationId}/structure`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.hint || 'Failed to load structure');
      }

      setStructure(data.floors);

    } catch (error: any) {
      console.error('[LoadStructure] Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStructure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  // Floor handler
  async function handleAddFloor(name: string) {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getAuthToken();
      
      const response = await fetch(`/api/admin/locations/${locationId}/floors`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create floor');
      }
      
      await loadStructure();
      setShowAddFloorModal(false);
    } catch (error: any) {
      console.error('[AddFloor] Error:', error);
      setError(error.message);
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
      
      const token = await getAuthToken();
      
      const response = await fetch(
        `/api/admin/locations/${locationId}/floors/${selectedFloorId}/rooms`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
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
    } catch (error: any) {
      console.error('[AddRoom] Error:', error);
      setError(error.message);
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
      
      const token = await getAuthToken();
      
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
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create target');
      }
      
      await loadStructure();
      setShowAddTargetModal(false);
      setSelectedRoomId(null);
    } catch (error: any) {
      console.error('[AddTarget] Error:', error);
      setError(error.message);
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
      
      const token = await getAuthToken();
      
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
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create action');
      }
      
      await loadStructure();
      setShowAddActionModal(false);
      setSelectedTargetId(null);
    } catch (error: any) {
      console.error('[AddAction] Error:', error);
      setError(error.message);
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
      
      const token = await getAuthToken();
      
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
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to add tool');
      }
      
      await loadStructure();
      setShowAddToolModal(false);
      setSelectedActionId(null);
    } catch (error: any) {
      console.error('[AddTool] Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  // Loading state
  if (loading && !structure) {
    return (
      <div className="space-y-4">
        {/* Skeleton stats bar */}
        <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
        
        {/* Skeleton floors */}
        <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
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

      {/* Empty state */}
      {(!structure || structure.length === 0) && !loading && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No structure configured
          </h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Set up your location's floors, rooms, and cleaning targets to get started.
          </p>
          <div className="flex items-center justify-center gap-4">
            {onRunWizard && (
              <>
                <button
                  onClick={onRunWizard}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Sparkles className="w-5 h-5" />
                  Run Setup Wizard
                </button>
                <span className="text-gray-400">or</span>
              </>
            )}
            <button
              onClick={() => setShowAddFloorModal(true)}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Floor Manually
            </button>
          </div>
        </div>
      )}

      {/* Stats summary bar */}
      {structure && structure.length > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-gray-700">
                {stats.floors} floor{stats.floors !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="w-px h-4 bg-gray-300" />
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-gray-700">
                {stats.rooms} room{stats.rooms !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="w-px h-4 bg-gray-300" />
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-600" />
              <span className="font-medium text-gray-700">
                {stats.targets} target{stats.targets !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="w-px h-4 bg-gray-300" />
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="font-medium text-gray-700">
                {stats.actions} action{stats.actions !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="w-px h-4 bg-gray-300" />
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-700">
                ~{stats.totalMinutes} min total
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      {structure && structure.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowAddFloorModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Floor
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
      )}

      {/* Floor list */}
      {structure?.map((floor: any, floorIndex: number) => (
        <FloorCard
          key={floor.id}
          floor={floor}
          floorIndex={floorIndex}
          totalFloors={structure.length}
          isExpanded={expandedFloors.has(floor.id)}
          onToggle={() => toggleFloor(floor.id)}
          onAddRoom={(floorId: string) => {
            setSelectedFloorId(floorId);
            setShowAddRoomModal(true);
          }}
          onAddTarget={(roomId: string) => {
            setSelectedRoomId(roomId);
            setShowAddTargetModal(true);
          }}
          onAddAction={(targetId: string) => {
            setSelectedTargetId(targetId);
            setShowAddActionModal(true);
          }}
          onAddTool={(actionId: string) => {
            setSelectedActionId(actionId);
            setShowAddToolModal(true);
          }}
          getRoomIcon={getRoomIcon}
          expandedRooms={expandedRooms}
          toggleRoom={toggleRoom}
        />
      ))}

      {/* Wizard re-run hint */}
      {structure && structure.length > 0 && onRunWizard && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Lightbulb className="w-4 h-4" />
              <span>Need to make bulk changes?</span>
            </div>
            <button
              onClick={onRunWizard}
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              Re-run Setup Wizard →
            </button>
          </div>
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
interface FloorCardProps {
  floor: any;
  floorIndex: number;
  totalFloors: number;
  isExpanded: boolean;
  onToggle: () => void;
  onAddRoom: (floorId: string) => void;
  onAddTarget: (roomId: string) => void;
  onAddAction: (targetId: string) => void;
  onAddTool: (actionId: string) => void;
  getRoomIcon: (roomType?: string) => string;
  expandedRooms: Set<string>;
  toggleRoom: (roomId: string) => void;
}

function FloorCard({ 
  floor, 
  floorIndex,
  totalFloors,
  isExpanded, 
  onToggle, 
  onAddRoom, 
  onAddTarget, 
  onAddAction,
  onAddTool,
  getRoomIcon,
  expandedRooms,
  toggleRoom,
}: FloorCardProps) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm mb-4">
      {/* Floor header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button onClick={onToggle} className="p-1 hover:bg-gray-200 rounded">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-500" />
            )}
          </button>
          <Building2 className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-900">{floor.name}</span>
          <span className="text-sm text-gray-500">
            ({floor.rooms?.length || 0} room{floor.rooms?.length !== 1 ? 's' : ''})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddRoom(floor.id)}
            className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1 hover:bg-blue-50 rounded-md transition-colors"
          >
            + Add Room
          </button>
          <ContextMenu
            onDelete={() => {}}
            onMoveUp={floorIndex > 0 ? () => {} : undefined}
            onMoveDown={floorIndex < totalFloors - 1 ? () => {} : undefined}
            canMoveUp={floorIndex > 0}
            canMoveDown={floorIndex < totalFloors - 1}
          />
        </div>
      </div>

      {/* Rooms */}
      {isExpanded && floor.rooms?.length > 0 && (
        <div className="p-4">
          {floor.rooms.map((room: any, roomIndex: number) => (
            <div 
              key={room.id} 
              className={`relative pl-6 ${roomIndex < floor.rooms.length - 1 ? 'pb-4' : ''}`}
            >
              {/* Vertical line */}
              {roomIndex < floor.rooms.length - 1 && (
                <div className="absolute left-2 top-6 bottom-0 w-px bg-gray-200" />
              )}
              {/* Horizontal connector */}
              <div className="absolute left-2 top-3 w-4 h-px bg-gray-200" />
              
              {/* Room content */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Room header */}
                <div className="flex items-center justify-between p-3 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleRoom(room.id)} className="p-0.5 hover:bg-gray-200 rounded">
                      {expandedRooms.has(room.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                    <span className="text-lg">{getRoomIcon(room.type)}</span>
                    <span className="font-medium text-gray-800">{room.name}</span>
                    <span className="text-sm text-gray-500">
                      ({room.targets?.length || 0} target{room.targets?.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onAddTarget(room.id)}
                      className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                    >
                      + Target
                    </button>
                    <ContextMenu
                      onDelete={() => {}}
                    />
                  </div>
                </div>

                {/* Targets */}
                {expandedRooms.has(room.id) && room.targets?.length > 0 && (
                  <div className="p-3 space-y-3">
                    {room.targets.map((target: any) => (
                      <div key={target.id} className="pl-4 border-l-2 border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-orange-500" />
                            <span className="font-medium text-gray-700">{target.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onAddAction(target.id)}
                              className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                            >
                              + Action
                            </button>
                            <ContextMenu
                              onDelete={() => {}}
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        {target.actions?.length > 0 && (
                          <div className="ml-6 space-y-1">
                            {target.actions.map((action: any) => (
                              <div
                                key={action.id}
                                className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 group"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                  <span className="text-sm text-gray-600">{action.name}</span>
                                  {action.durationMinutes && (
                                    <span className="text-xs text-gray-400">
                                      · {action.durationMinutes} min
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => onAddTool(action.id)}
                                  className="text-xs text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  + Tool
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty targets state */}
                {expandedRooms.has(room.id) && (!room.targets || room.targets.length === 0) && (
                  <div className="p-3">
                    <p className="text-gray-400 text-xs">No targets yet</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty rooms state */}
      {isExpanded && (!floor.rooms || floor.rooms.length === 0) && (
        <div className="p-4">
          <p className="text-gray-400 text-sm">No rooms yet</p>
        </div>
      )}
    </div>
  );
}
