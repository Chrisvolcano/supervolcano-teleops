/**
 * Task Type Definitions
 * Tasks are work orders assigned to teleoperators or human workers
 * Located at: /locations/{locationId}/tasks/{taskId}
 */

export type TaskCategory = "cleaning" | "maintenance" | "inspection" | "delivery" | "security";
export type TaskPriority = 1 | 2 | 3 | 4 | 5;
export type TaskAssignmentType = "oem_teleoperator" | "human" | "unassigned";
export type TaskStatus = "active" | "draft" | "archived";

export interface Task {
  id: string;
  locationId: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  estimatedDuration: number; // minutes
  
  // Assignment - CRITICAL
  assignmentType: TaskAssignmentType;
  assignedTeleoperatorId?: string; // If assignmentType === 'oem_teleoperator'
  assignedTeleoperatorName?: string; // Denormalized for display
  assignedHumanName?: string; // If assignmentType === 'human'
  
  status: TaskStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string;
}

export interface TaskInput {
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  estimatedDuration: number;
  assignmentType: TaskAssignmentType;
  assignedTeleoperatorId?: string;
  assignedTeleoperatorName?: string;
  assignedHumanName?: string;
  status: TaskStatus;
}

