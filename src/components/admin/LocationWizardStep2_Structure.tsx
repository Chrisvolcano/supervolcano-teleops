/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Home, Target, Zap } from 'lucide-react';
import { StructureData, Floor, Room, Target as TargetType, Action } from './CreateLocationWizard';
import { useAuth } from '@/hooks/useAuth';
import { getValidTargetsForRoom } from '@/constants/roomTargetMap';
import ActionSelectionModal from './ActionSelectionModal';
import ToolSelectionModal from './ToolSelectionModal';

interface RoomType {
  id: string;
  name: string;
  color: string;
}

interface TargetTypeData {
  id: string;
  name: string;
}

interface ActionTypeData {
  id: string;
  name: string;
}

interface LocationWizardStep2_StructureProps {
  data: StructureData;
  onChange: (data: StructureData) => void;
}

export default function LocationWizardStep2_Structure({
  data,
  onChange,
}: LocationWizardStep2_StructureProps) {
  const { getIdToken } = useAuth();
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [targetTypes, setTargetTypes] = useState<TargetTypeData[]>([]);
  const [actionTypes, setActionTypes] = useState<ActionTypeData[]>([]);
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set());
  const [showRoomPicker, setShowRoomPicker] = useState<{ floorId: string } | null>(null);
  const [showTargetPicker, setShowTargetPicker] = useState<{ floorId: string; roomId: string } | null>(null);
  const [showActionPicker, setShowActionPicker] = useState<{ floorId: string; roomId: string; targetId: string } | null>(null);
  const [showToolPicker, setShowToolPicker] = useState<{ floorId: string; roomId: string; targetId: string; actionName: string } | null>(null);
  
  // Store current context for action/tool modals
  const [currentRoomForAction, setCurrentRoomForAction] = useState<any>(null);
  const [currentTargetForAction, setCurrentTargetForAction] = useState<any>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    loadLibrary();
  }, []);

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

  function addFloor() {
    const newFloor: Floor = {
      tempId: `temp-floor-${Date.now()}`,
      name: `Floor ${data.floors.length + 1}`,
      rooms: [],
    };
    onChange({ floors: [...data.floors, newFloor] });
    setExpandedFloors(new Set([...expandedFloors, newFloor.tempId]));
  }

  function removeFloor(floorId: string) {
    onChange({ floors: data.floors.filter((f) => f.tempId !== floorId) });
    const newSet = new Set(expandedFloors);
    newSet.delete(floorId);
    setExpandedFloors(newSet);
  }

  function addRoom(floorId: string, roomTypeId: string) {
    const roomType = roomTypes.find((rt) => rt.id === roomTypeId);
    if (!roomType) return;

    const newRoom: Room = {
      tempId: `temp-room-${Date.now()}`,
      roomTypeId,
      roomTypeName: roomType.name,
      targets: [],
    };

    onChange({
      floors: data.floors.map((floor) =>
        floor.tempId === floorId
          ? { ...floor, rooms: [...floor.rooms, newRoom] }
          : floor
      ),
    });
    setExpandedRooms(new Set([...expandedRooms, newRoom.tempId]));
  }

  function removeRoom(floorId: string, roomId: string) {
    onChange({
      floors: data.floors.map((floor) =>
        floor.tempId === floorId
          ? { ...floor, rooms: floor.rooms.filter((r) => r.tempId !== roomId) }
          : floor
      ),
    });
  }

  function addTarget(floorId: string, roomId: string, targetTypeId: string) {
    const targetType = targetTypes.find((tt) => tt.id === targetTypeId);
    if (!targetType) return;

    const newTarget: TargetType = {
      tempId: `temp-target-${Date.now()}`,
      targetTypeId,
      targetTypeName: targetType.name,
      actions: [],
    };

    onChange({
      floors: data.floors.map((floor) =>
        floor.tempId === floorId
          ? {
              ...floor,
              rooms: floor.rooms.map((room) =>
                room.tempId === roomId
                  ? { ...room, targets: [...room.targets, newTarget] }
                  : room
              ),
            }
          : floor
      ),
    });
  }

  function removeTarget(floorId: string, roomId: string, targetId: string) {
    onChange({
      floors: data.floors.map((floor) =>
        floor.tempId === floorId
          ? {
              ...floor,
              rooms: floor.rooms.map((room) =>
                room.tempId === roomId
                  ? { ...room, targets: room.targets.filter((t) => t.tempId !== targetId) }
                  : room
              ),
            }
          : floor
      ),
    });
  }

  function addAction(
    floorId: string,
    roomId: string,
    targetId: string,
    actionName: string,
    toolName?: string
  ) {
    // Find matching action type by name (fallback to creating from name)
    const actionType = actionTypes.find((at) => 
      at.name.toLowerCase() === actionName.toLowerCase()
    );

    const newAction: Action = {
      actionTypeId: actionType?.id || `action-${Date.now()}`,
      actionTypeName: actionName,
      tool: toolName || undefined,
    };

    onChange({
      floors: data.floors.map((floor) =>
        floor.tempId === floorId
          ? {
              ...floor,
              rooms: floor.rooms.map((room) =>
                room.tempId === roomId
                  ? {
                      ...room,
                      targets: room.targets.map((target) =>
                        target.tempId === targetId
                          ? { ...target, actions: [...target.actions, newAction] }
                          : target
                      ),
                    }
                  : room
              ),
            }
          : floor
      ),
    });
  }

  function removeAction(floorId: string, roomId: string, targetId: string, actionIndex: number) {
    onChange({
      floors: data.floors.map((floor) =>
        floor.tempId === floorId
          ? {
              ...floor,
              rooms: floor.rooms.map((room) =>
                room.tempId === roomId
                  ? {
                      ...room,
                      targets: room.targets.map((target) =>
                        target.tempId === targetId
                          ? {
                              ...target,
                              actions: target.actions.filter((_, idx) => idx !== actionIndex),
                            }
                          : target
                      ),
                    }
                  : room
              ),
            }
          : floor
      ),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Build Structure</h3>
          <p className="text-gray-600">
            Add floors, rooms, targets, and actions to define your location.
          </p>
        </div>
        <button
          onClick={addFloor}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Floor
        </button>
      </div>

      {data.floors.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <p className="text-gray-600 mb-4">No floors yet. Start by adding your first floor.</p>
          <button
            onClick={addFloor}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add First Floor
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {data.floors.map((floor) => (
            <FloorCard
              key={floor.tempId}
              floor={floor}
              roomTypes={roomTypes}
              targetTypes={targetTypes}
              actionTypes={actionTypes}
              expanded={expandedFloors.has(floor.tempId)}
              expandedRooms={expandedRooms}
              expandedTargets={expandedTargets}
              onToggle={() => {
                const newSet = new Set(expandedFloors);
                if (newSet.has(floor.tempId)) {
                  newSet.delete(floor.tempId);
                } else {
                  newSet.add(floor.tempId);
                }
                setExpandedFloors(newSet);
              }}
              onRemove={() => removeFloor(floor.tempId)}
              onAddRoom={() => setShowRoomPicker({ floorId: floor.tempId })}
              onRemoveRoom={(roomId: string) => removeRoom(floor.tempId, roomId)}
              onToggleRoom={(roomId: string) => {
                const newSet = new Set(expandedRooms);
                if (newSet.has(roomId)) {
                  newSet.delete(roomId);
                } else {
                  newSet.add(roomId);
                }
                setExpandedRooms(newSet);
              }}
              onAddTarget={(roomId: string) => setShowTargetPicker({ floorId: floor.tempId, roomId })}
              onRemoveTarget={(roomId: string, targetId: string) => removeTarget(floor.tempId, roomId, targetId)}
              onToggleTarget={(targetId: string) => {
                const newSet = new Set(expandedTargets);
                if (newSet.has(targetId)) {
                  newSet.delete(targetId);
                } else {
                  newSet.add(targetId);
                }
                setExpandedTargets(newSet);
              }}
              onAddAction={(roomId: string, targetId: string) => {
                const room = floor.rooms.find(r => r.tempId === roomId);
                const target = room?.targets.find(t => t.tempId === targetId);
                const roomType = roomTypes.find(rt => rt.name === room?.roomTypeName);
                
                if (room && target) {
                  setCurrentRoomForAction({ 
                    name: room.roomTypeName, 
                    type: roomType?.name || room.roomTypeName 
                  });
                  setCurrentTargetForAction({ 
                    name: target.targetTypeName, 
                    type: target.targetTypeName 
                  });
                  setShowActionPicker({ floorId: floor.tempId, roomId, targetId });
                }
              }}
              onRemoveAction={(roomId: string, targetId: string, actionIndex: number) =>
                removeAction(floor.tempId, roomId, targetId, actionIndex)
              }
            />
          ))}
        </div>
      )}

      {/* Room Picker Modal */}
      {showRoomPicker && (
        <RoomPickerModal
          roomTypes={roomTypes}
          onSelect={(id: string) => {
            addRoom(showRoomPicker.floorId, id);
            setShowRoomPicker(null);
          }}
          onClose={() => setShowRoomPicker(null)}
        />
      )}

      {/* Target Picker Modal */}
      {showTargetPicker && (() => {
        // Find the room to get its type/name for filtering
        const floor = data.floors.find(f => f.tempId === showTargetPicker.floorId);
        const room = floor?.rooms.find(r => r.tempId === showTargetPicker.roomId);
        const roomType = roomTypes.find(rt => rt.id === room?.roomTypeId);
        
        return (
          <TargetPickerModal
            targetTypes={targetTypes}
            selectedRoom={roomType ? { name: roomType.name, type: roomType.name } : null}
            onSelect={(id: string) => {
              addTarget(showTargetPicker.floorId, showTargetPicker.roomId, id);
              setShowTargetPicker(null);
            }}
            onClose={() => setShowTargetPicker(null)}
          />
        );
      })()}

      {/* Action Selection Modal with Filtering */}
      {showActionPicker && (
        <ActionSelectionModal
          isOpen={!!showActionPicker}
          onClose={() => {
            setShowActionPicker(null);
            setCurrentRoomForAction(null);
            setCurrentTargetForAction(null);
          }}
          onSelectAction={(actionName: string) => {
            setPendingAction(actionName);
            setShowActionPicker(null);
            // Open tool modal immediately after action selection
            setShowToolPicker({
              floorId: showActionPicker.floorId,
              roomId: showActionPicker.roomId,
              targetId: showActionPicker.targetId,
              actionName: actionName
            });
          }}
          selectedRoom={currentRoomForAction}
          selectedTarget={currentTargetForAction}
        />
      )}

      {/* Tool Selection Modal */}
      {showToolPicker && (
        <ToolSelectionModal
          isOpen={!!showToolPicker}
          onClose={() => {
            setShowToolPicker(null);
            setPendingAction(null);
          }}
          onSelectTool={(toolName: string) => {
            addAction(
              showToolPicker.floorId,
              showToolPicker.roomId,
              showToolPicker.targetId,
              showToolPicker.actionName,
              toolName
            );
            setShowToolPicker(null);
            setPendingAction(null);
            setCurrentRoomForAction(null);
            setCurrentTargetForAction(null);
          }}
          onSkip={() => {
            addAction(
              showToolPicker.floorId,
              showToolPicker.roomId,
              showToolPicker.targetId,
              showToolPicker.actionName
            );
            setShowToolPicker(null);
            setPendingAction(null);
            setCurrentRoomForAction(null);
            setCurrentTargetForAction(null);
          }}
          selectedRoom={currentRoomForAction}
          selectedTarget={currentTargetForAction}
          selectedAction={{ name: showToolPicker.actionName, type: showToolPicker.actionName }}
        />
      )}
    </div>
  );
}

interface FloorCardProps {
  floor: Floor;
  roomTypes: RoomType[];
  targetTypes: TargetTypeData[];
  actionTypes: ActionTypeData[];
  expanded: boolean;
  expandedRooms: Set<string>;
  expandedTargets: Set<string>;
  onToggle: () => void;
  onRemove: () => void;
  onAddRoom: () => void;
  onRemoveRoom: (roomId: string) => void;
  onToggleRoom: (roomId: string) => void;
  onAddTarget: (roomId: string) => void;
  onRemoveTarget: (roomId: string, targetId: string) => void;
  onToggleTarget: (targetId: string) => void;
  onAddAction: (roomId: string, targetId: string) => void;
  onRemoveAction: (roomId: string, targetId: string, actionIndex: number) => void;
}

function FloorCard({
  floor,
  roomTypes,
  targetTypes,
  actionTypes,
  expanded,
  expandedRooms,
  expandedTargets,
  onToggle,
  onRemove,
  onAddRoom,
  onRemoveRoom,
  onToggleRoom,
  onAddTarget,
  onRemoveTarget,
  onToggleTarget,
  onAddAction,
  onRemoveAction,
}: FloorCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-4 flex items-center justify-between bg-gray-50">
        <button onClick={onToggle} className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium">{floor.name}</span>
          <span className="text-sm text-gray-500">({floor.rooms.length} rooms)</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddRoom}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-white"
          >
            + Room
          </button>
          <button onClick={onRemove} className="p-1 text-red-600 hover:bg-red-50 rounded">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-2">
          {floor.rooms.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No rooms yet</p>
          ) : (
            floor.rooms.map((room: Room) => (
              <RoomCard
                key={room.tempId}
                room={room}
                targetTypes={targetTypes}
                actionTypes={actionTypes}
                expanded={expandedRooms.has(room.tempId)}
                expandedTargets={expandedTargets}
                onToggle={() => onToggleRoom(room.tempId)}
                onRemove={() => onRemoveRoom(room.tempId)}
                onAddTarget={() => onAddTarget(room.tempId)}
                onRemoveTarget={(targetId: string) => onRemoveTarget(room.tempId, targetId)}
                onToggleTarget={onToggleTarget}
                onAddAction={(targetId: string) => onAddAction(room.tempId, targetId)}
                onRemoveAction={(targetId: string, actionIndex: number) =>
                  onRemoveAction(room.tempId, targetId, actionIndex)
                }
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface RoomCardProps {
  room: Room;
  targetTypes: TargetTypeData[];
  actionTypes: ActionTypeData[];
  expanded: boolean;
  expandedTargets: Set<string>;
  onToggle: () => void;
  onRemove: () => void;
  onAddTarget: () => void;
  onRemoveTarget: (targetId: string) => void;
  onToggleTarget: (targetId: string) => void;
  onAddAction: (targetId: string) => void;
  onRemoveAction: (targetId: string, actionIndex: number) => void;
}

function RoomCard({
  room,
  targetTypes,
  actionTypes,
  expanded,
  expandedTargets,
  onToggle,
  onRemove,
  onAddTarget,
  onRemoveTarget,
  onToggleTarget,
  onAddAction,
  onRemoveAction,
}: RoomCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-3 flex items-center justify-between bg-white">
        <button onClick={onToggle} className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <Home className="h-3 w-3 text-gray-600" />
          <span className="text-sm font-medium">{room.roomTypeName}</span>
          <span className="text-xs text-gray-500">({room.targets.length} targets)</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddTarget}
            className="px-2 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
          >
            + Target
          </button>
          <button onClick={onRemove} className="p-1 text-red-600 hover:bg-red-50 rounded">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 bg-gray-50 space-y-2">
          {room.targets.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-2">No targets yet</p>
          ) : (
            room.targets.map((target: TargetType) => (
              <TargetCard
                key={target.tempId}
                target={target}
                actionTypes={actionTypes}
                expanded={expandedTargets.has(target.tempId)}
                onToggle={() => onToggleTarget(target.tempId)}
                onRemove={() => onRemoveTarget(target.tempId)}
                onAddAction={() => onAddAction(target.tempId)}
                onRemoveAction={(actionIndex: number) =>
                  onRemoveAction(target.tempId, actionIndex)
                }
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface TargetCardProps {
  target: TargetType;
  actionTypes: ActionTypeData[];
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onAddAction: () => void;
  onRemoveAction: (actionIndex: number) => void;
}

function TargetCard({
  target,
  actionTypes,
  expanded,
  onToggle,
  onRemove,
  onAddAction,
  onRemoveAction,
}: TargetCardProps) {
  return (
    <div className="border border-gray-200 rounded bg-white">
      <div className="p-2 flex items-center justify-between">
        <button onClick={onToggle} className="flex items-center gap-1.5">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <Target className="h-3 w-3 text-gray-600" />
          <span className="text-xs font-medium">{target.targetTypeName}</span>
          <span className="text-xs text-gray-500">({target.actions.length} actions)</span>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={onAddAction}
            className="px-1.5 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
          >
            + Action
          </button>
          <button onClick={onRemove} className="p-0.5 text-red-600 hover:bg-red-50 rounded">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-2 bg-gray-50 space-y-1">
          {target.actions.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-1">No actions yet</p>
          ) : (
            target.actions.map((action: Action, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between p-1.5 bg-white rounded border border-gray-200"
              >
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs">{action.actionTypeName}</span>
                </div>
                <button
                  onClick={() => onRemoveAction(idx)}
                  className="p-0.5 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface RoomPickerModalProps {
  roomTypes: RoomType[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

function RoomPickerModal({ roomTypes, onSelect, onClose }: RoomPickerModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
        <h3 className="text-lg font-semibold mb-4">Select Room Type</h3>
        <div className="grid grid-cols-3 gap-3">
          {roomTypes.map((type: RoomType) => (
            <button
              key={type.id}
              onClick={() => onSelect(type.id)}
              className="p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
            >
              {type.name}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 border rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

interface TargetPickerModalProps {
  targetTypes: TargetTypeData[];
  selectedRoom?: { name: string; type?: string } | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

function TargetPickerModal({ targetTypes, selectedRoom, onSelect, onClose }: TargetPickerModalProps) {
  
  // Filter targets based on selected room
  const filteredTargetTypes = selectedRoom 
    ? targetTypes.filter(target => {
        const validTargets = getValidTargetsForRoom(selectedRoom.name || selectedRoom.type);
        // Match by name (case-insensitive)
        return validTargets.some(valid => 
          valid.toLowerCase() === target.name.toLowerCase()
        );
      })
    : targetTypes; // Show all if no room selected

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Select Target Type</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {selectedRoom && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Showing targets for: <span className="font-semibold">
                {selectedRoom.name || selectedRoom.type}
              </span>
            </p>
          </div>
        )}

        {filteredTargetTypes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No targets available for this room type.</p>
            <p className="text-sm mt-2">Try selecting a different room or add targets manually.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filteredTargetTypes.map((type: TargetTypeData) => (
              <button
                key={type.id}
                onClick={() => onSelect(type.id)}
                className="p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center font-medium"
              >
                {type.name}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 border rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

interface ActionPickerModalProps {
  actionTypes: ActionTypeData[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

function ActionPickerModal({ actionTypes, onSelect, onClose }: ActionPickerModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
        <h3 className="text-lg font-semibold mb-4">Select Action Type</h3>
        <div className="grid grid-cols-3 gap-3">
          {actionTypes.map((type: ActionTypeData) => (
            <button
              key={type.id}
              onClick={() => onSelect(type.id)}
              className="p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
            >
              {type.name}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 border rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

