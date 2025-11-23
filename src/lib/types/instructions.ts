/**
 * Instruction Type Definitions
 * Instructions are step-by-step guides for completing tasks
 * Located at: /locations/{locationId}/tasks/{taskId}/instructions/{instructionId}
 */

export interface Instruction {
  id: string;
  taskId: string;
  locationId: string;
  title: string;
  description: string;
  stepNumber: number; // Order within the task (1, 2, 3...)
  room?: string; // Optional: which room this applies to
  imageUrls: string[]; // Firebase Storage URLs
  videoUrls: string[]; // Firebase Storage URLs
  notes?: string; // Additional context
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string;
}

export interface InstructionInput {
  title: string;
  description: string;
  room?: string;
  stepNumber?: number;
  notes?: string;
}

