export type SVProperty = {
  id: string;
  name: string;
  address: string;
  images: string[];
  createdAt: any;
  createdBy: string;
  isActive: boolean;
};

export type SVTaskTemplate = {
  id: string;
  name: string;
  difficulty: "easy" | "mid" | "high";
  defaultAssignedTo: "teleoperator" | "human";
  isActive: boolean;
  stats?: {
    assignedTeleop: number;
    completedTeleop: number;
    assignedHuman: number;
    completedHuman: number;
  };
};

export type SVTask = {
  id: string;
  propertyId: string;
  templateId: string;
  name: string;
  assigned_to: "teleoperator" | "human";
  status:
    | "scheduled"
    | "available"
    | "claimed"
    | "in_progress"
    | "paused"
    | "completed"
    | "failed"
    | "aborted";
  durationMin?: number;
  createdAt: any;
  createdBy: string;
};
