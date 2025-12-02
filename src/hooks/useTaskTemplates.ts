import { useMemo } from "react";

import { useCollection } from "@/hooks/useCollection";

export type TaskTemplateStats = {
  assignedTeleop: number;
  completedTeleop: number;
  assignedHuman: number;
  completedHuman: number;
};

export type TaskTemplate = {
  id: string;
  name: string;
  difficulty: "easy" | "mid" | "high";
  defaultAssignedTo: "oem_teleoperator" | "human";
  stats: TaskTemplateStats;
  isActive: boolean;
};

export function useTaskTemplates() {
  const {
    data,
    loading,
    error,
  } = useCollection<TaskTemplate>({
    path: "taskTemplates",
    enabled: true,
    orderByField: { field: "name", direction: "asc" },
    parse: (doc) =>
      ({
        id: doc.id,
        name: doc.name ?? "Untitled template",
        difficulty: (doc.difficulty ?? "easy") as TaskTemplate["difficulty"],
        defaultAssignedTo: (doc.defaultAssignedTo ?? "oem_teleoperator") as TaskTemplate["defaultAssignedTo"],
        stats: {
          assignedTeleop: doc.stats?.assignedTeleop ?? 0,
          completedTeleop: doc.stats?.completedTeleop ?? 0,
          assignedHuman: doc.stats?.assignedHuman ?? 0,
          completedHuman: doc.stats?.completedHuman ?? 0,
        },
        isActive: doc.isActive ?? true,
      }) as TaskTemplate,
  });

  const activeTemplates = useMemo(() => data.filter((template) => template.isActive), [data]);

  return { templates: data, activeTemplates, loading, error };
}
