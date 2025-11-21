export type TimestampLike =
  | { toDate: () => Date }
  | { seconds: number; nanoseconds: number }
  | Date
  | null
  | undefined;

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
  updatedBy?: string | null;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
};

export type SVTaskTemplate = {
  id: string;
  name: string;
  difficulty: TaskDifficulty;
  defaultAssignedTo: TaskAssignment;
  isActive: boolean;
  stats: TaskTemplateStats;
  partnerOrgId?: string;
};

export type TaskState =
  | "scheduled"
  | "available"
  | "claimed"
  | "in_progress"
  | "paused"
  | "completed"
  | "failed"
  | "aborted";

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
