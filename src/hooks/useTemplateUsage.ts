import { useMemo } from "react";

import { useCollection } from "@/hooks/useCollection";

export type TemplateUsageRow = {
  propertyId: string;
  propertyName: string;
  openCount: number;
  completedCount: number;
};

export function useTemplateUsage(templateId: string | null) {
  const {
    data: tasks,
    loading: tasksLoading,
  } = useCollection<{ propertyId: string; status: string }>({
    path: "tasks",
    enabled: Boolean(templateId),
    whereEqual: templateId ? [{ field: "templateId", value: templateId }] : undefined,
    parse: (doc) =>
      ({
        propertyId: doc.propertyId,
        status: doc.status ?? doc.state ?? "scheduled",
      }) as { propertyId: string; status: string },
  });

  const {
    data: properties,
    loading: propertiesLoading,
  } = useCollection<{ id: string; name: string }>({
    path: "properties",
    enabled: Boolean(templateId),
    parse: (doc) => ({ id: doc.id, name: doc.name ?? "Untitled property" }),
  });

  const usage = useMemo<TemplateUsageRow[]>(() => {
    if (!templateId) return [];
    const propertyMap = new Map(properties.map((property) => [property.id, property.name]));
    const grouped = new Map<string, TemplateUsageRow>();

    tasks.forEach((task) => {
      const current = grouped.get(task.propertyId) ?? {
        propertyId: task.propertyId,
        propertyName: propertyMap.get(task.propertyId) ?? "Unknown property",
        openCount: 0,
        completedCount: 0,
      };
      if (task.status === "completed") {
        current.completedCount += 1;
      } else {
        current.openCount += 1;
      }
      grouped.set(task.propertyId, current);
    });

    return Array.from(grouped.values()).sort((a, b) => a.propertyName.localeCompare(b.propertyName));
  }, [tasks, properties, templateId]);

  return {
    usage,
    loading: tasksLoading || propertiesLoading,
  };
}
