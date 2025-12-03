/**
 * LOCATION WIZARD STATE MANAGEMENT
 * Handles wizard flow, auto-save, and state persistence
 */

import { useState, useCallback, useEffect } from 'react';
import { useDebounce } from './useDebounce';
import { RoomTemplate, getRoomTemplate, ROOM_TEMPLATES } from '@/lib/templates/location-templates';
import { 
  AccessInfo, 
  StorageLocation, 
  Preference, 
  Restriction 
} from '@/types/location-intelligence';

export type WizardStep = 'floors' | 'rooms' | 'targets' | 'access' | 'storage' | 'preferences' | 'review' | 'completion';

export interface FloorData {
  id: string;
  name: string;
  sortOrder: number;
  rooms: RoomData[];
}

export interface RoomData {
  id: string;
  name: string;
  type: string;
  icon: string;
  floorId: string;
  sortOrder: number;
  targets: TargetData[];
  useTemplate: boolean;
}

export interface TargetData {
  id: string;
  name: string;
  icon: string;
  roomId: string;
  sortOrder: number;
  actions: ActionData[];
}

export interface ActionData {
  id: string;
  name: string;
  durationMinutes: number;
  targetId: string;
  sortOrder: number;
  tools?: string[];
  instructions?: string;
}

export interface WizardState {
  locationId: string;
  currentStep: WizardStep;
  currentFloorIndex: number;
  currentRoomIndex: number;
  floors: FloorData[];
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  // Intelligence data
  accessInfo: AccessInfo;
  storageLocations: StorageLocation[];
  preferences: Preference[];
  restrictions: Restriction[];
}

interface UseLocationWizardProps {
  locationId: string;
  initialData?: {
    floors: FloorData[];
    accessInfo?: AccessInfo;
    storageLocations?: StorageLocation[];
    preferences?: Preference[];
    restrictions?: Restriction[];
  };
  onSave: (data: { 
    floors: FloorData[];
    accessInfo?: AccessInfo;
    storageLocations?: StorageLocation[];
    preferences?: Preference[];
    restrictions?: Restriction[];
  }) => Promise<void>;
}

export function useLocationWizard({ locationId, initialData, onSave }: UseLocationWizardProps) {
  const [state, setState] = useState<WizardState>({
    locationId,
    currentStep: 'floors',
    currentFloorIndex: 0,
    currentRoomIndex: 0,
    floors: initialData?.floors || [],
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    accessInfo: initialData?.accessInfo || {},
    storageLocations: initialData?.storageLocations || [],
    preferences: initialData?.preferences || [],
    restrictions: initialData?.restrictions || [],
  });

  // Debounced save
  const debouncedFloors = useDebounce(state.floors, 1000);

  // Auto-save when floors change
  useEffect(() => {
    if (state.hasUnsavedChanges && debouncedFloors.length > 0) {
      handleSave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFloors, state.hasUnsavedChanges]);

  const handleSave = useCallback(async () => {
    if (state.isSaving) return;
    
    setState(prev => ({ ...prev, isSaving: true }));
    
    try {
      await onSave({ 
        floors: state.floors,
        accessInfo: state.accessInfo,
        storageLocations: state.storageLocations,
        preferences: state.preferences,
        restrictions: state.restrictions,
      });
      setState(prev => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
        hasUnsavedChanges: false,
      }));
    } catch (error) {
      console.error('Failed to save:', error);
      setState(prev => ({ ...prev, isSaving: false }));
    }
  }, [state.floors, state.accessInfo, state.storageLocations, state.preferences, state.restrictions, state.isSaving, onSave]);

  // Generate unique ID
  const generateId = () => crypto.randomUUID();

  // ============================================
  // FLOOR OPERATIONS
  // ============================================

  const setFloorCount = useCallback((count: number) => {
    const newFloors: FloorData[] = [];
    
    for (let i = 0; i < count; i++) {
      const existing = state.floors[i];
      newFloors.push(existing || {
        id: generateId(),
        name: count === 1 ? 'Main Floor' : `Floor ${i + 1}`,
        sortOrder: i,
        rooms: [],
      });
    }
    
    setState(prev => ({
      ...prev,
      floors: newFloors,
      hasUnsavedChanges: true,
      currentStep: 'rooms',
      currentFloorIndex: 0,
    }));
  }, [state.floors]);

  const addFloor = useCallback((name?: string) => {
    const newFloor: FloorData = {
      id: generateId(),
      name: name || `Floor ${state.floors.length + 1}`,
      sortOrder: state.floors.length,
      rooms: [],
    };
    
    setState(prev => ({
      ...prev,
      floors: [...prev.floors, newFloor],
      hasUnsavedChanges: true,
    }));
  }, [state.floors.length]);

  const updateFloor = useCallback((floorId: string, updates: Partial<FloorData>) => {
    setState(prev => ({
      ...prev,
      floors: prev.floors.map(f => 
        f.id === floorId ? { ...f, ...updates } : f
      ),
      hasUnsavedChanges: true,
    }));
  }, []);

  const removeFloor = useCallback((floorId: string) => {
    setState(prev => ({
      ...prev,
      floors: prev.floors.filter(f => f.id !== floorId),
      hasUnsavedChanges: true,
    }));
  }, []);

  // ============================================
  // ROOM OPERATIONS
  // ============================================

  const addRoom = useCallback((floorId: string, roomType: string, customName?: string) => {
    const template = getRoomTemplate(roomType);
    const floor = state.floors.find(f => f.id === floorId);
    
    if (!floor) return;
    
    // Count existing rooms of this type for auto-numbering
    const existingCount = floor.rooms.filter(r => r.type === roomType).length;
    const roomName = customName || (existingCount > 0 
      ? `${template?.name || roomType} ${existingCount + 1}`
      : template?.name || roomType);
    
    const newRoom: RoomData = {
      id: generateId(),
      name: roomName,
      type: roomType,
      icon: template?.icon || '📦',
      floorId,
      sortOrder: floor.rooms.length,
      targets: [],
      useTemplate: true,
    };
    
    // Auto-populate targets from template
    if (template) {
      newRoom.targets = template.defaultTargets.map((t, i) => {
        const targetId = generateId();
        return {
          id: targetId,
          name: t.name,
          icon: t.icon,
          roomId: newRoom.id,
          sortOrder: i,
          actions: t.defaultActions.map((a, j) => ({
            id: generateId(),
            name: a.name,
            durationMinutes: a.defaultDurationMinutes,
            targetId: targetId,
            sortOrder: j,
            tools: a.toolsRequired,
            instructions: a.instructions,
          })),
        };
      });
    }
    
    setState(prev => ({
      ...prev,
      floors: prev.floors.map(f => 
        f.id === floorId 
          ? { ...f, rooms: [...f.rooms, newRoom] }
          : f
      ),
      hasUnsavedChanges: true,
    }));
    
    return newRoom;
  }, [state.floors]);

  const addBulkRooms = useCallback((floorId: string, roomType: string, count: number) => {
    const template = getRoomTemplate(roomType);
    const floor = state.floors.find(f => f.id === floorId);
    
    if (!floor || !template) return;
    
    const newRooms: RoomData[] = [];
    const existingCount = floor.rooms.filter(r => r.type === roomType).length;
    
    for (let i = 0; i < count; i++) {
      const roomNum = existingCount + i + 1;
      const newRoom: RoomData = {
        id: generateId(),
        name: `${template.name} ${roomNum}`,
        type: roomType,
        icon: template.icon,
        floorId,
        sortOrder: floor.rooms.length + i,
        targets: template.defaultTargets.map((t, ti) => {
          const targetId = generateId();
          return {
            id: targetId,
            name: t.name,
            icon: t.icon,
            roomId: '', // Will be set after room is created
            sortOrder: ti,
            actions: t.defaultActions.map((a, ai) => ({
              id: generateId(),
              name: a.name,
              durationMinutes: a.defaultDurationMinutes,
              targetId: targetId,
              sortOrder: ai,
              tools: a.toolsRequired,
              instructions: a.instructions,
            })),
          };
        }),
        useTemplate: true,
      };
      
      // Fix roomId references in targets
      newRoom.targets.forEach(target => {
        target.roomId = newRoom.id;
      });
      
      newRooms.push(newRoom);
    }
    
    setState(prev => ({
      ...prev,
      floors: prev.floors.map(f => 
        f.id === floorId 
          ? { ...f, rooms: [...f.rooms, ...newRooms] }
          : f
      ),
      hasUnsavedChanges: true,
    }));
  }, [state.floors]);

  const updateRoom = useCallback((roomId: string, updates: Partial<RoomData>) => {
    setState(prev => ({
      ...prev,
      floors: prev.floors.map(f => ({
        ...f,
        rooms: f.rooms.map(r => 
          r.id === roomId ? { ...r, ...updates } : r
        ),
      })),
      hasUnsavedChanges: true,
    }));
  }, []);

  const removeRoom = useCallback((roomId: string) => {
    setState(prev => ({
      ...prev,
      floors: prev.floors.map(f => ({
        ...f,
        rooms: f.rooms.filter(r => r.id !== roomId),
      })),
      hasUnsavedChanges: true,
    }));
  }, []);

  // ============================================
  // TARGET OPERATIONS
  // ============================================

  const addTarget = useCallback((roomId: string, targetName: string, icon: string = '📦') => {
    setState(prev => ({
      ...prev,
      floors: prev.floors.map(f => ({
        ...f,
        rooms: f.rooms.map(r => {
          if (r.id !== roomId) return r;
          
          const newTarget: TargetData = {
            id: generateId(),
            name: targetName,
            icon,
            roomId,
            sortOrder: r.targets.length,
            actions: [],
          };
          
          return { ...r, targets: [...r.targets, newTarget] };
        }),
      })),
      hasUnsavedChanges: true,
    }));
  }, []);

  const updateTarget = useCallback((targetId: string, updates: Partial<TargetData>) => {
    setState(prev => ({
      ...prev,
      floors: prev.floors.map(f => ({
        ...f,
        rooms: f.rooms.map(r => ({
          ...r,
          targets: r.targets.map(t => 
            t.id === targetId ? { ...t, ...updates } : t
          ),
        })),
      })),
      hasUnsavedChanges: true,
    }));
  }, []);

  const removeTarget = useCallback((targetId: string) => {
    setState(prev => ({
      ...prev,
      floors: prev.floors.map(f => ({
        ...f,
        rooms: f.rooms.map(r => ({
          ...r,
          targets: r.targets.filter(t => t.id !== targetId),
        })),
      })),
      hasUnsavedChanges: true,
    }));
  }, []);

  // ============================================
  // ACTION OPERATIONS
  // ============================================

  const addAction = useCallback((targetId: string, actionName: string, durationMinutes: number = 5) => {
    setState(prev => ({
      ...prev,
      floors: prev.floors.map(f => ({
        ...f,
        rooms: f.rooms.map(r => ({
          ...r,
          targets: r.targets.map(t => {
            if (t.id !== targetId) return t;
            
            const newAction: ActionData = {
              id: generateId(),
              name: actionName,
              durationMinutes,
              targetId,
              sortOrder: t.actions.length,
            };
            
            return { ...t, actions: [...t.actions, newAction] };
          }),
        })),
      })),
      hasUnsavedChanges: true,
    }));
  }, []);

  const updateAction = useCallback((actionId: string, updates: Partial<ActionData>) => {
    setState(prev => ({
      ...prev,
      floors: prev.floors.map(f => ({
        ...f,
        rooms: f.rooms.map(r => ({
          ...r,
          targets: r.targets.map(t => ({
            ...t,
            actions: t.actions.map(a => 
              a.id === actionId ? { ...a, ...updates } : a
            ),
          })),
        })),
      })),
      hasUnsavedChanges: true,
    }));
  }, []);

  const removeAction = useCallback((actionId: string) => {
    setState(prev => ({
      ...prev,
      floors: prev.floors.map(f => ({
        ...f,
        rooms: f.rooms.map(r => ({
          ...r,
          targets: r.targets.map(t => ({
            ...t,
            actions: t.actions.filter(a => a.id !== actionId),
          })),
        })),
      })),
      hasUnsavedChanges: true,
    }));
  }, []);

  // ============================================
  // NAVIGATION
  // ============================================

  const goToStep = useCallback((step: WizardStep) => {
    console.log('[Wizard] goToStep called with:', step);
    
    // Allow direct navigation to completion (it's outside normal flow)
    if (step === 'completion') {
      console.log('[Wizard] Setting step to completion');
      setState(prev => ({ ...prev, currentStep: 'completion' }));
      return;
    }
    
    const validSteps: WizardStep[] = ['floors', 'rooms', 'targets', 'access', 'storage', 'preferences', 'review'];
    if (validSteps.includes(step)) {
      console.log('[Wizard] Setting step to:', step);
      setState(prev => ({ ...prev, currentStep: step }));
    }
  }, []);

  const goToNextStep = useCallback(() => {
    const steps: WizardStep[] = ['floors', 'rooms', 'targets', 'access', 'storage', 'preferences', 'review'];
    const currentIndex = steps.indexOf(state.currentStep);
    console.log('[Wizard] goToNextStep - current:', state.currentStep, 'index:', currentIndex);
    
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      console.log('[Wizard] Going to next step:', nextStep);
      setState(prev => ({ ...prev, currentStep: nextStep }));
    }
  }, [state.currentStep]);

  const goToPreviousStep = useCallback(() => {
    const steps: WizardStep[] = ['floors', 'rooms', 'targets', 'access', 'storage', 'preferences', 'review'];
    const currentIndex = steps.indexOf(state.currentStep);
    console.log('[Wizard] goToPreviousStep - current:', state.currentStep, 'index:', currentIndex);
    
    if (currentIndex > 0) {
      const prevStep = steps[currentIndex - 1];
      console.log('[Wizard] Going to previous step:', prevStep);
      setState(prev => ({ ...prev, currentStep: prevStep }));
    }
  }, [state.currentStep]);

  const setCurrentFloor = useCallback((index: number) => {
    setState(prev => ({ ...prev, currentFloorIndex: index }));
  }, []);

  const setCurrentRoom = useCallback((index: number) => {
    setState(prev => ({ ...prev, currentRoomIndex: index }));
  }, []);

  // ============================================
  // INTELLIGENCE OPERATIONS
  // ============================================

  const setAccessInfo = useCallback((accessInfo: AccessInfo) => {
    setState(prev => ({ ...prev, accessInfo, hasUnsavedChanges: true }));
  }, []);

  const setStorageLocations = useCallback((storageLocations: StorageLocation[]) => {
    setState(prev => ({ ...prev, storageLocations, hasUnsavedChanges: true }));
  }, []);

  const setPreferences = useCallback((preferences: Preference[]) => {
    setState(prev => ({ ...prev, preferences, hasUnsavedChanges: true }));
  }, []);

  const setRestrictions = useCallback((restrictions: Restriction[]) => {
    setState(prev => ({ ...prev, restrictions, hasUnsavedChanges: true }));
  }, []);

  // ============================================
  // SUMMARY STATS
  // ============================================

  const getStats = useCallback(() => {
    let totalRooms = 0;
    let totalTargets = 0;
    let totalActions = 0;
    let estimatedMinutes = 0;

    state.floors.forEach(floor => {
      totalRooms += floor.rooms.length;
      floor.rooms.forEach(room => {
        totalTargets += room.targets.length;
        room.targets.forEach(target => {
          totalActions += target.actions.length;
          target.actions.forEach(action => {
            estimatedMinutes += action.durationMinutes;
          });
        });
      });
    });

    return {
      floors: state.floors.length,
      rooms: totalRooms,
      targets: totalTargets,
      actions: totalActions,
      estimatedMinutes,
    };
  }, [state.floors]);

  return {
    state,
    // Floor operations
    setFloorCount,
    addFloor,
    updateFloor,
    removeFloor,
    // Room operations
    addRoom,
    addBulkRooms,
    updateRoom,
    removeRoom,
    // Target operations
    addTarget,
    updateTarget,
    removeTarget,
    // Action operations
    addAction,
    updateAction,
    removeAction,
    // Intelligence operations
    setAccessInfo,
    setStorageLocations,
    setPreferences,
    setRestrictions,
    // Navigation
    goToStep,
    goToNextStep,
    goToPreviousStep,
    setCurrentFloor,
    setCurrentRoom,
    // Utilities
    getStats,
    handleSave,
    // Templates
    roomTemplates: ROOM_TEMPLATES,
  };
}

