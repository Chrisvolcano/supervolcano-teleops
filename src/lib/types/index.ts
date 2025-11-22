/**
 * Core TypeScript interfaces for the Teleoperator Portal
 * Designed for scale: 10,000+ teleoperators, 100,000+ locations
 */

// ============================================================================
// TELEOPERATORS
// ============================================================================

export type TeleoperatorStatus = "available" | "busy" | "offline" | "on-break";

export interface Teleoperator {
  teleoperatorId: string; // UUID, primary key
  // User Info
  email: string;
  displayName: string;
  photoUrl?: string;
  // Partner
  partnerOrgId: string; // Which OEM partner they work for
  // Status
  currentStatus: TeleoperatorStatus;
  // Skills
  certifications: string[];
  robotTypesQualified: string[];
  // Availability
  schedule?: {
    weeklyHours: number;
    timezone: string;
    availabilityWindows?: Array<{
      dayOfWeek: number; // 0-6 (Sunday-Saturday)
      startTime: string; // HH:mm format
      endTime: string;
    }>;
  };
  // Performance
  tasksCompleted: number;
  averageRating?: number; // 1-5 scale
  hoursWorked: number;
  // Contact
  phone?: string;
  preferredContactMethod?: "email" | "phone" | "sms";
  // Metadata
  createdAt: Date | string;
  lastActiveAt?: Date | string;
  createdBy?: string; // User UID who created this
  // Firebase Auth link
  uid: string; // Links to Firebase Auth user
}

// ============================================================================
// LOCATIONS
// ============================================================================

export type LocationType = "home" | "office" | "warehouse" | "retail" | "other";
export type LocationStatus = "active" | "inactive";

export interface Location {
  locationId: string; // UUID, primary key
  // Basic Info
  name: string;
  address: string;
  type: LocationType;
  // Contact
  primaryContact?: {
    name: string;
    phone: string;
    email: string;
  };
  // Partner
  partnerOrgId: string; // Which OEM partner manages this
  // Assignment
  assignedTeleoperatorIds: string[]; // Array of teleoperator IDs
  // Access
  accessInstructions?: string;
  entryCode?: string;
  parkingInfo?: string;
  // Metadata
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy?: string;
  status: LocationStatus;
  // Coordinates
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// ============================================================================
// LOCATION INSTRUCTIONS (Subcollection)
// ============================================================================

export type InstructionCategory = "cleaning" | "organization" | "maintenance" | "security" | "other";
export type InstructionScope = "room-level" | "appliance-level" | "object-level";

export interface LocationInstruction {
  instructionId: string; // UUID
  locationId: string; // Parent location
  // Classification
  category: InstructionCategory;
  scope: InstructionScope;
  target: string; // room, appliance, or objectType
  // Instructions
  title: string; // e.g., "Where to store TV remote"
  steps: string[]; // Array of step descriptions
  constraints?: string; // e.g., "Must be within 2 feet of couch"
  media: {
    photos: string[]; // Firebase Storage URLs
    videos: string[]; // Firebase Storage URLs
  };
  // Preferences
  customerPreferences?: Record<string, unknown>; // e.g., { blindPosition: "closed", thermostat: 72 }
  // Version control
  version: number;
  previousVersionId?: string;
  approvedBy?: string;
  approvedAt?: Date | string;
  // Metadata
  createdAt: Date | string;
  updatedAt: Date | string;
  priority: number; // 1-5 scale
}

// ============================================================================
// TASKS (Work Orders)
// ============================================================================

export type TaskStatus = "unassigned" | "assigned" | "in-progress" | "completed" | "cancelled";
export type TaskType = "cleaning" | "inspection" | "delivery" | "maintenance" | "other";

export interface Task {
  taskId: string; // UUID
  locationId: string; // FK to locations
  // Assignment
  assignedTeleoperatorId?: string;
  assignedPartnerId: string;
  // Status
  status: TaskStatus;
  // Scheduling
  scheduledFor?: Date | string;
  estimatedDuration?: number; // minutes
  recurringPattern?: {
    frequency: "daily" | "weekly" | "monthly";
    interval: number;
    endDate?: Date | string;
  };
  // Type
  taskType: TaskType;
  // Instructions
  instructionIds: string[]; // References to location_instructions
  // Description
  title: string;
  description?: string;
  specialRequirements?: string;
  // Execution
  startedAt?: Date | string;
  completedAt?: Date | string;
  executionLog?: Array<{
    timestamp: Date | string;
    action: string;
    status: string;
    teleoperatorId: string;
  }>;
  issuesEncountered?: string[];
  // Verification
  photosBefore: string[]; // Firebase Storage URLs
  photosAfter: string[]; // Firebase Storage URLs
  qualityScore?: number; // 1-5 scale
  verifiedBy?: string;
  // Notes
  teleoperatorNotes?: string;
  customerFeedback?: string;
  // Metadata
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy?: string;
  priority: number; // 1-5 scale
}

// ============================================================================
// SHIFTS (Teleoperator Scheduling)
// ============================================================================

export type ShiftStatus = "scheduled" | "active" | "completed" | "cancelled";

export interface Shift {
  shiftId: string; // UUID
  teleoperatorId: string; // FK to teleoperators
  // Schedule
  startTime: Date | string;
  endTime: Date | string;
  timezone: string;
  // Status
  status: ShiftStatus;
  // Assignments
  taskIds: string[]; // Tasks assigned during this shift
  locationIds: string[]; // Locations covered in this shift
  // Metadata
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ============================================================================
// PARTNERS (OEM Organizations)
// ============================================================================

export interface Partner {
  partnerId: string; // UUID
  name: string;
  contactInfo: {
    email: string;
    phone?: string;
    address?: string;
  };
  businessType?: string;
  // Access
  locationIds: string[];
  teleoperatorIds: string[];
  // Billing
  subscriptionTier?: "basic" | "professional" | "enterprise";
  monthlyTaskVolume?: number;
  // Settings
  preferences?: Record<string, unknown>;
  customFields?: Record<string, unknown>;
  // Metadata
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ============================================================================
// EXECUTION LOGS (Subcollection under tasks)
// ============================================================================

export interface ExecutionLog {
  logId: string; // UUID
  taskId: string; // Parent task
  timestamp: Date | string;
  action: string;
  status: string;
  teleoperatorId: string;
  // Details
  stepCompleted?: string;
  anomaliesDetected?: string[];
  photos?: string[]; // Firebase Storage URLs
  // Performance
  timeSpent?: number; // seconds
  accuracy?: number; // 0-100 percentage
  // Notes
  text?: string;
  issuesSolved?: string[];
}

// ============================================================================
// SESSIONS (Active Teleoperator Sessions)
// ============================================================================

export type SessionStatus = "active" | "paused" | "ended";

export interface Session {
  sessionId: string; // UUID
  teleoperatorId: string; // FK to teleoperators
  taskId?: string; // FK to tasks (if currently on a task)
  startedAt: Date | string;
  endedAt?: Date | string;
  status: SessionStatus;
  robotId?: string; // Which robot they're controlling, if applicable
}

// ============================================================================
// AUTH & PERMISSIONS
// ============================================================================

export type UserRole = "superadmin" | "partner_admin" | "teleoperator";

export interface UserClaims {
  role: UserRole;
  partnerId?: string; // For partner_admin and teleoperator
  teleoperatorId?: string; // For teleoperator only
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

// ============================================================================
// LEGACY TYPES (for backward compatibility with existing code)
// ============================================================================

export type TimestampLike =
  | { toDate: () => Date }
  | { seconds: number; nanoseconds: number }
  | Date
  | string
  | null
  | undefined;

// Legacy property types (renamed to locations in new system)
export type PropertyStatus = "scheduled" | "unassigned";

export type TaskAssignment = "teleoperator" | "human";

export type TaskDifficulty = "easy" | "mid" | "high";

export type TaskTemplateStats = {
  assignedTeleop: number;
  completedTeleop: number;
  assignedHuman: number;
  completedHuman: number;
};

export type PropertyMediaType = "image" | "video";

export type PropertyMediaItem = {
  id: string;
  url: string;
  type: PropertyMediaType;
  storagePath?: string;
  contentType?: string | null;
  createdAt?: TimestampLike;
};

export type SVProperty = {
  id: string;
  name: string;
  partnerOrgId: string;
  address?: string;
  description?: string;
  images: string[];
  media: PropertyMediaItem[];
  imageCount: number;
  videoCount: number;
  status: PropertyStatus;
  isActive: boolean;
  taskCount: number;
  createdBy?: string | null;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
  updatedBy?: string | null;
};

// Legacy TaskState (for backward compatibility with old code)
export type TaskState =
  | "scheduled"
  | "available"
  | "claimed"
  | "in_progress"
  | "paused"
  | "completed"
  | "failed"
  | "aborted";

export type SVTaskTemplate = {
  id: string;
  name: string;
  difficulty: TaskDifficulty;
  defaultAssignedTo: TaskAssignment;
  isActive: boolean;
  stats: TaskTemplateStats;
  partnerOrgId?: string;
};

export type SVTask = {
  id: string;
  locationId: string;
  partnerOrgId: string;
  templateId?: string | null;
  name: string;
  assignment: TaskAssignment;
  status: TaskState;
  duration?: number | null;
  priority?: "low" | "medium" | "high" | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
  assignedToUserId?: string | null;
};

