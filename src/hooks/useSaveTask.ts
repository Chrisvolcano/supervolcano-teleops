import { useCallback, useState } from "react";

import {
  createTask,
  deleteTask,
  updateTask,
} from "@/lib/repositories/tasksRepo";
import type { TaskAssignment, TaskState } from "@/lib/types";

type BaseInput = {
  name: string;
  assignment: TaskAssignment;
  duration?: number | null;
  priority?: "low" | "medium" | "high" | null;
  templateId?: string | null;
  status?: TaskState;
};

type CreateInput = BaseInput & {
  locationId: string;
  partnerOrgId: string;
  createdBy: string;
};

type UpdateInput = BaseInput & {
  id: string;
};

export function useSaveTask() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (input: CreateInput) => {
    setLoading(true);
    setError(null);
    try {
      return await createTask({
        locationId: input.locationId,
        partnerOrgId: input.partnerOrgId,
        templateId: input.templateId,
        name: input.name,
        assignment: input.assignment,
        duration: input.duration,
        priority: input.priority,
        status: input.status,
        createdBy: input.createdBy,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create task.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (input: UpdateInput) => {
    setLoading(true);
    setError(null);
    try {
      await updateTask(input.id, {
        name: input.name,
        assignment: input.assignment,
        duration: input.duration,
        priority: input.priority,
        templateId: input.templateId,
        status: input.status,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update task.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await deleteTask(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete task.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    create,
    update,
    remove,
    loading,
    error,
  };
}
