import { TaskStructure } from '@/lib/taxonomy';

export interface Task {
  id: string;
  
  // Title can be either:
  // 1. Auto-generated from structure (preferred)
  // 2. Manually entered (legacy compatibility)
  title: string;
  description: string;
  
  // NEW: Optional structured fields
  // When present, title should be auto-generated
  structure?: TaskStructure;
  
  // Existing fields
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'available' | 'in_progress' | 'completed';
  locationId?: string;
  locationName?: string;
  locationAddress?: string;
  estimatedDuration?: number;
  
  // Media attachments
  media?: Array<{
    id: string;
    storageUrl: string;
    thumbnailUrl?: string;
    fileType?: string;
    duration?: number;
  }>;
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateTaskInput {
  // Option 1: Use structured input (preferred for new tasks)
  structure?: TaskStructure;
  
  // Option 2: Use manual title (legacy compatibility)
  title?: string;
  
  // Required fields
  description: string;
  locationId: string;
  
  // Optional fields
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  estimatedDuration?: number;
  media?: Array<{
    storageUrl: string;
    thumbnailUrl?: string;
    fileType?: string;
    duration?: number;
  }>;
}



