import { useMemo } from "react";

import { useCollection } from "@/hooks/useCollection";

export type SessionRecord = {
  id: string;
  taskId: string;
  taskName: string;
  locationId: string;
  locationName: string;
  startedAt?: string;
  endedAt?: string;
  outcome: "completed" | "failed" | "aborted";
  stopCode?: string;
  teleopUserId?: string;
  humanUserId?: string;
  metrics: {
    robotActiveSec: number;
    humanActiveSec: number;
  };
  qc: {
    rating: number;
    notes: string;
  };
};

export function useSessions() {
  const {
    data: properties,
    loading: propertiesLoading,
  } = useCollection<{ id: string; name: string }>({
    path: "locations",
    enabled: true,
    parse: (doc) => ({ id: doc.id, name: doc.name ?? "Untitled property" }),
  });

  const {
    data: tasks,
    loading: tasksLoading,
  } = useCollection<{ id: string; name: string }>({
    path: "tasks",
    enabled: true,
    parse: (doc) => ({ id: doc.id, name: doc.name ?? doc.title ?? "Untitled task" }),
  });

  const {
    data: sessions,
    loading: sessionsLoading,
    error,
  } = useCollection<any>({
    path: "sessions",
    enabled: true,
  });

  const propertyMap = useMemo(() => new Map(properties.map((property) => [property.id, property.name])), [properties]);
  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task.name])), [tasks]);

  const enrichedSessions = useMemo<SessionRecord[]>(() => {
    return sessions.map((session) => ({
      id: session.id,
      taskId: session.taskId,
      taskName: taskMap.get(session.taskId) ?? "Unknown task",
      locationId: session.locationId ?? session.propertyId,
      locationName: propertyMap.get(session.locationId ?? session.propertyId) ?? "Unknown location",
      startedAt: session.started_at ?? session.startedAt,
      endedAt: session.ended_at ?? session.endedAt,
      outcome: (session.outcome ?? "completed") as SessionRecord["outcome"],
      stopCode: session.stop_code ?? undefined,
      teleopUserId: session.teleop_user_id ?? undefined,
      humanUserId: session.human_user_id ?? undefined,
      metrics: {
        robotActiveSec: session.metrics?.robotActiveSec ?? 0,
        humanActiveSec: session.metrics?.humanActiveSec ?? 0,
      },
      qc: {
        rating: session.qc?.rating ?? 0,
        notes: session.qc?.notes ?? "",
      },
    }));
  }, [sessions, propertyMap, taskMap]);

  return {
    sessions: enrichedSessions,
    loading: propertiesLoading || tasksLoading || sessionsLoading,
    error,
  };
}
