/**
 * LOCATION BUILDER TYPES
 * Strict TypeScript interfaces for type safety
 * Last updated: 2025-11-26
 */

export interface Target {
  id: string;
  name: string;
  type: TargetType;
  tempId?: string; // For client-side tracking before save
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  targets: Target[];
  tempId?: string;
}

export interface Floor {
  id: string;
  name: string;
  floorNumber: number;
  rooms: Room[];
  tempId?: string;
}

export interface LocationData {
  name: string;
  address: string;
  floors: Floor[];
}

export type RoomType = 
  | 'kitchen' 
  | 'bathroom' 
  | 'bedroom' 
  | 'living_room' 
  | 'dining_room' 
  | 'office' 
  | 'laundry' 
  | 'garage' 
  | 'hallway' 
  | 'other';

export type TargetType = 
  | 'surface' 
  | 'appliance' 
  | 'fixture' 
  | 'furniture' 
  | 'other';

export interface ValidationError {
  field: string;
  message: string;
}

export interface WizardStep {
  number: 1 | 2 | 3;
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  isValid: boolean;
}

