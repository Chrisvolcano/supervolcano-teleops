/**
 * LOCATION VALIDATION UTILITIES
 * Extracted validation logic for reusability
 * Last updated: 2025-11-26
 */

import type { LocationData, ValidationError } from '@/types/location-builder.types';

export function validateBasicInfo(name: string, address: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!name || name.trim().length < 2) {
    errors.push({
      field: 'name',
      message: 'Location name must be at least 2 characters',
    });
  }

  if (name && name.trim().length > 100) {
    errors.push({
      field: 'name',
      message: 'Location name must be less than 100 characters',
    });
  }

  if (!address || address.trim().length < 5) {
    errors.push({
      field: 'address',
      message: 'Please enter a valid address',
    });
  }

  return errors;
}

export function validateStructure(floors: LocationData['floors']): ValidationError[] {
  const errors: ValidationError[] = [];

  if (floors.length === 0) {
    errors.push({
      field: 'floors',
      message: 'At least one floor is required',
    });
    return errors;
  }

  floors.forEach((floor, floorIndex) => {
    if (!floor.name || floor.name.trim().length === 0) {
      errors.push({
        field: `floors[${floorIndex}].name`,
        message: `Floor ${floorIndex + 1} needs a name`,
      });
    }

    if (floor.rooms.length === 0) {
      errors.push({
        field: `floors[${floorIndex}].rooms`,
        message: `Floor "${floor.name}" needs at least one room`,
      });
    }

    floor.rooms.forEach((room, roomIndex) => {
      if (!room.name || room.name.trim().length === 0) {
        errors.push({
          field: `floors[${floorIndex}].rooms[${roomIndex}].name`,
          message: `Room ${roomIndex + 1} on ${floor.name} needs a name`,
        });
      }

      if (room.targets.length === 0) {
        errors.push({
          field: `floors[${floorIndex}].rooms[${roomIndex}].targets`,
          message: `Room "${room.name}" needs at least one target`,
        });
      }

      room.targets.forEach((target, targetIndex) => {
        if (!target.name || target.name.trim().length === 0) {
          errors.push({
            field: `floors[${floorIndex}].rooms[${roomIndex}].targets[${targetIndex}].name`,
            message: `Target ${targetIndex + 1} in ${room.name} needs a name`,
          });
        }
      });
    });
  });

  return errors;
}

export function hasDuplicateNames(items: Array<{ name: string }>): boolean {
  const names = items.map(item => item.name.toLowerCase().trim());
  return new Set(names).size !== names.length;
}

