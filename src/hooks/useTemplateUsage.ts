import { useMemo } from "react";

import { useCollection } from "@/hooks/useCollection";

export type TemplateUsageRow = {
  locationId: string;
  locationName: string;
  openCount: number;
  completedCount: number;
};

export function useTemplateUsage(templateId: string | null) {
  const {
    data: tasks,
    loading: tasksLoading,
  } = useCollection<{ locationId: string; status: string }>({
    path: "tasks",
    enabled: Boolean(templateId),
    whereEqual: templateId ? [{ field: "templateId", value: templateId }] : undefined,
    parse: (doc) =>
      ({
        locationId: doc.locationId ?? doc.propertyId,
        status: doc.status ?? doc.state ?? "scheduled",
      }) as { locationId: string; status: string },
  });

  const {
    data: properties,
    loading: propertiesLoading,
  } = useCollection<{ id: string; name: string }>({
    path: "locations",
    enabled: Boolean(templateId),
    parse: (doc) => ({ id: doc.id, name: doc.name ?? "Untitled property" }),
  });

  const usage = useMemo<TemplateUsageRow[]>(() => {
    if (!templateId) return [];
    const propertyMap = new Map(properties.map((property) => [property.id, property.name]));
    const grouped = new Map<string, TemplateUsageRow>();

    tasks.forEach((task) => {
      const current = grouped.get(task.locationId) ?? {
        locationId: task.locationId,
        locationName: propertyMap.get(task.locationId) ?? "Unknown location",
        openCount: 0,
        completedCount: 0,
      };
      if (task.status === "completed") {
        current.completedCount += 1;
      } else {
        current.openCount += 1;
      }
      grouped.set(task.locationId, current);
    });

    return Array.from(grouped.values()).sort((a, b) => a.locationName.localeCompare(b.locationName));
  }, [tasks, properties, templateId]);

  return {
    usage,
    loading: tasksLoading || propertiesLoading,
  };
}
