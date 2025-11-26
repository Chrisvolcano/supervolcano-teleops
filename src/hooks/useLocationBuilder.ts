/**
 * LOCATION BUILDER HOOK
 * Business logic hook for location creation wizard
 * Last updated: 2025-11-26
 */

import { useState, useCallback } from 'react';
import type { Floor, Room, Target, LocationData } from '@/types/location-builder.types';
import { validateBasicInfo, validateStructure } from '@/utils/location-validation';
import { getAuth } from 'firebase/auth';

export function useLocationBuilder() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [floors, setFloors] = useState<Floor[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Add floor with proper immutability
  const addFloor = useCallback(() => {
    const newFloor: Floor = {
      id: '', // Will be set by backend
      tempId: `temp-floor-${Date.now()}`,
      name: `Floor ${floors.length + 1}`,
      floorNumber: floors.length + 1,
      rooms: [],
    };
    setFloors(prev => [...prev, newFloor]);
  }, [floors.length]);

  // Update floor name
  const updateFloorName = useCallback((tempId: string, newName: string) => {
    setFloors(prev => prev.map(floor =>
      floor.tempId === tempId ? { ...floor, name: newName } : floor
    ));
  }, []);

  // Delete floor
  const deleteFloor = useCallback((tempId: string) => {
    setFloors(prev => prev.filter(floor => floor.tempId !== tempId));
  }, []);

  // Add room to floor
  const addRoom = useCallback((floorTempId: string) => {
    setFloors(prev => prev.map(floor => {
      if (floor.tempId === floorTempId) {
        const newRoom: Room = {
          id: '',
          tempId: `temp-room-${Date.now()}`,
          name: '',
          type: 'kitchen',
          targets: [],
        };
        return { ...floor, rooms: [...floor.rooms, newRoom] };
      }
      return floor;
    }));
  }, []);

  // Update room
  const updateRoom = useCallback((
    floorTempId: string,
    roomTempId: string,
    updates: Partial<Room>
  ) => {
    setFloors(prev => prev.map(floor => {
      if (floor.tempId === floorTempId) {
        return {
          ...floor,
          rooms: floor.rooms.map(room =>
            room.tempId === roomTempId ? { ...room, ...updates } : room
          ),
        };
      }
      return floor;
    }));
  }, []);

  // Delete room
  const deleteRoom = useCallback((floorTempId: string, roomTempId: string) => {
    setFloors(prev => prev.map(floor => {
      if (floor.tempId === floorTempId) {
        return {
          ...floor,
          rooms: floor.rooms.filter(room => room.tempId !== roomTempId),
        };
      }
      return floor;
    }));
  }, []);

  // Add target to room
  const addTarget = useCallback((floorTempId: string, roomTempId: string) => {
    setFloors(prev => prev.map(floor => {
      if (floor.tempId === floorTempId) {
        return {
          ...floor,
          rooms: floor.rooms.map(room => {
            if (room.tempId === roomTempId) {
              const newTarget: Target = {
                id: '',
                tempId: `temp-target-${Date.now()}`,
                name: '',
                type: 'surface',
              };
              return { ...room, targets: [...room.targets, newTarget] };
            }
            return room;
          }),
        };
      }
      return floor;
    }));
  }, []);

  // Update target
  const updateTarget = useCallback((
    floorTempId: string,
    roomTempId: string,
    targetTempId: string,
    updates: Partial<Target>
  ) => {
    setFloors(prev => prev.map(floor => {
      if (floor.tempId === floorTempId) {
        return {
          ...floor,
          rooms: floor.rooms.map(room => {
            if (room.tempId === roomTempId) {
              return {
                ...room,
                targets: room.targets.map(target =>
                  target.tempId === targetTempId ? { ...target, ...updates } : target
                ),
              };
            }
            return room;
          }),
        };
      }
      return floor;
    }));
  }, []);

  // Delete target
  const deleteTarget = useCallback((
    floorTempId: string,
    roomTempId: string,
    targetTempId: string
  ) => {
    setFloors(prev => prev.map(floor => {
      if (floor.tempId === floorTempId) {
        return {
          ...floor,
          rooms: floor.rooms.map(room => {
            if (room.tempId === roomTempId) {
              return {
                ...room,
                targets: room.targets.filter(target => target.tempId !== targetTempId),
              };
            }
            return room;
          }),
        };
      }
      return floor;
    }));
  }, []);

  // Validate current step
  const validateCurrentStep = useCallback((): boolean => {
    setErrors([]);

    if (currentStep === 1) {
      const validationErrors = validateBasicInfo(name, address);
      if (validationErrors.length > 0) {
        setErrors(validationErrors.map(e => e.message));
        return false;
      }
    }

    if (currentStep === 2) {
      const validationErrors = validateStructure(floors);
      if (validationErrors.length > 0) {
        setErrors(validationErrors.map(e => e.message));
        return false;
      }
    }

    return true;
  }, [currentStep, name, address, floors]);

  // Navigate to next step
  const goToNextStep = useCallback(() => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(3, prev + 1));
    }
  }, [validateCurrentStep]);

  // Navigate to previous step
  const goToPreviousStep = useCallback(() => {
    setErrors([]);
    setCurrentStep(prev => Math.max(1, prev - 1));
  }, []);

  // Submit location
  const submitLocation = useCallback(async (organizationId: string): Promise<boolean> => {
    if (!validateCurrentStep()) {
      return false;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      // Get auth token
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Not authenticated');
      }
      const token = await user.getIdToken();

      const locationData: LocationData = {
        name: name.trim(),
        address: address.trim(),
        floors,
      };

      const response = await fetch('/api/admin/locations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...locationData,
          organizationId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create location');
      }

      return true;
    } catch (error: any) {
      setErrors([error.message]);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [name, address, floors, validateCurrentStep]);

  // Calculate stats
  const stats = {
    totalFloors: floors.length,
    totalRooms: floors.reduce((sum, floor) => sum + floor.rooms.length, 0),
    totalTargets: floors.reduce((sum, floor) =>
      sum + floor.rooms.reduce((roomSum, room) => roomSum + room.targets.length, 0),
      0
    ),
  };

  return {
    // State
    name,
    address,
    floors,
    currentStep,
    isSubmitting,
    errors,
    stats,
    // Actions
    setName,
    setAddress,
    addFloor,
    updateFloorName,
    deleteFloor,
    addRoom,
    updateRoom,
    deleteRoom,
    addTarget,
    updateTarget,
    deleteTarget,
    goToNextStep,
    goToPreviousStep,
    submitLocation,
  };
}

