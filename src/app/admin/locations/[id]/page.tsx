"use client";

/**
 * Location Detail Page
 * Main page component that fetches and displays location with tasks and instructions
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LocationInfoSection } from "@/components/locations/LocationInfoSection";
import { TaskSection } from "@/components/locations/TaskSection";
import { TaskForm } from "@/components/locations/TaskForm";
import type { Location } from "@/lib/types";
import type { Task, TaskInput } from "@/lib/types/tasks";
import type { Instruction, InstructionInput } from "@/lib/types/instructions";

export default function LocationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const locationId = params.id as string;
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<Location | null>(null);
  const [organization, setOrganization] = useState<{ id: string; name: string } | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [instructionsByTask, setInstructionsByTask] = useState<Record<string, Instruction[]>>({});
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [teleoperators, setTeleoperators] = useState<Array<{ teleoperatorId: string; displayName: string }>>([]);
  
  // Form states
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Load location data
  const loadLocation = useCallback(async () => {
    if (!user || !locationId) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/v1/locations/${locationId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          router.push("/admin/locations");
          return;
        }
        throw new Error("Failed to load location");
      }

      const locationData: Location = await response.json();
      setLocation(locationData);

      // Load organization if assigned
      if (locationData.assignedOrganizationId) {
        try {
          const orgResponse = await fetch(`/api/v1/organizations/${locationData.assignedOrganizationId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (orgResponse.ok) {
            const orgData = await orgResponse.json();
            setOrganization({ id: orgData.id, name: orgData.name });
          }
        } catch (error) {
          console.error("Failed to load organization:", error);
          // Set organization name from location if available
          if (locationData.assignedOrganizationName) {
            setOrganization({
              id: locationData.assignedOrganizationId,
              name: locationData.assignedOrganizationName,
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to load location:", error);
      router.push("/admin/locations");
    }
  }, [user, locationId, router]);

  // Load tasks
  const loadTasks = useCallback(async () => {
    if (!user || !locationId) {
      console.log("[client] loadTasks - Skipping (no user or locationId)", { user: !!user, locationId });
      return;
    }

    console.log("[client] loadTasks - Starting", { locationId });

    try {
      const token = await user.getIdToken();
      const url = `/api/v1/locations/${locationId}/tasks?status=active`;
      
      console.log("[client] loadTasks - Fetching", { url });

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("[client] loadTasks - Response received", {
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[client] loadTasks - Error response", {
          status: response.status,
          error: errorData,
        });
        throw new Error(errorData.error || "Failed to load tasks");
      }

      const data = await response.json();
      const tasksData = data.tasks || [];
      
      console.log("[client] loadTasks - Success", {
        taskCount: tasksData.length,
        tasks: tasksData.map((t: Task) => ({ id: t.id, title: t.title })),
      });

      setTasks(tasksData);
      
      // Auto-expand all tasks initially
      const taskIds = new Set<string>(tasksData.map((t: Task) => t.id));
      setExpandedTasks(taskIds);
    } catch (error) {
      console.error("[client] loadTasks - Failed:", error);
    }
  }, [user, locationId]);

  // Load instructions for all tasks
  const loadInstructions = useCallback(async () => {
    if (!user || !locationId || tasks.length === 0) return;

    try {
      const token = await user.getIdToken();
      const instructionsMap: Record<string, Instruction[]> = {};

      // Load instructions for each task in parallel
      const instructionPromises = tasks.map(async (task) => {
        const response = await fetch(
          `/api/v1/locations/${locationId}/tasks/${task.id}/instructions`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          instructionsMap[task.id] = data.instructions || [];
        }
      });

      await Promise.all(instructionPromises);
      setInstructionsByTask(instructionsMap);
    } catch (error) {
      console.error("Failed to load instructions:", error);
    }
  }, [user, locationId, tasks]);

  // Load teleoperators for assignment dropdown
  const loadTeleoperators = useCallback(async () => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/v1/teleoperators", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTeleoperators(
          (data.teleoperators || []).map((t: any) => ({
            teleoperatorId: t.teleoperatorId,
            displayName: t.displayName,
          })),
        );
      }
    } catch (error) {
      console.error("Failed to load teleoperators:", error);
    }
  }, [user]);

  useEffect(() => {
    if (user && locationId) {
      setLoading(true);
      Promise.all([loadLocation(), loadTasks(), loadTeleoperators()]).finally(() => {
        setLoading(false);
      });
    }
  }, [user, locationId, loadLocation, loadTasks, loadTeleoperators]);

  useEffect(() => {
    if (tasks.length > 0) {
      loadInstructions();
    }
  }, [tasks, loadInstructions]);

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  // Task handlers
  const handleTaskSave = async (
    taskData: TaskInput,
    instructions: Array<{
      data: InstructionInput;
      imageUrls: string[];
      videoUrls: string[];
    }>,
  ) => {
    if (!user) return;

    console.log("[client] handleTaskSave - Starting", {
      editing: !!editingTask,
      taskId: editingTask?.id,
      data: { title: taskData.title, assignmentType: taskData.assignmentType },
      instructionCount: instructions.length,
    });

    try {
      const token = await user.getIdToken();
      const url = editingTask
        ? `/api/v1/locations/${locationId}/tasks/${editingTask.id}`
        : `/api/v1/locations/${locationId}/tasks`;
      
      const method = editingTask ? "PATCH" : "POST";

      console.log("[client] handleTaskSave - Sending request", { url, method });

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...taskData,
          instructions,
        }),
      });

      console.log("[client] handleTaskSave - Response received", {
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[client] handleTaskSave - Error response", errorData);
        throw new Error(errorData.error || "Failed to save task");
      }

      const result = await response.json();
      console.log("[client] handleTaskSave - Success", result);

      setShowTaskForm(false);
      setEditingTask(null);
      
      console.log("[client] handleTaskSave - Reloading tasks...");
      await loadTasks();
      console.log("[client] handleTaskSave - Tasks reloaded");
    } catch (error: any) {
      console.error("[client] handleTaskSave - Failed:", error);
      throw error;
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    if (!user || !confirm("Delete this task? This will also delete all instructions.")) {
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/v1/locations/${locationId}/tasks/${taskId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete task");
      }

      await loadTasks();
    } catch (error) {
      console.error("Failed to delete task:", error);
      alert("Failed to delete task. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <p>Loading location...</p>
      </div>
    );
  }

  if (!location) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Back Button */}
      <div className="mb-6">
        <Link href="/admin/locations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Locations
          </Button>
        </Link>
      </div>

      {/* Location Info Section */}
      <LocationInfoSection
        location={location}
        onEdit={() => router.push(`/admin/locations/${locationId}/edit`)}
        organizationName={organization?.name || location.assignedOrganizationName}
        organizationId={organization?.id || location.assignedOrganizationId}
      />

      {/* Tasks Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">
            📋 Tasks ({tasks.length})
          </h2>
          <Button
            onClick={() => {
              setEditingTask(null);
              setShowTaskForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-12 text-gray-500 border rounded-lg">
            <p>No tasks yet. Create your first task to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <TaskSection
                key={task.id}
                task={task}
                instructions={instructionsByTask[task.id] || []}
                isExpanded={expandedTasks.has(task.id)}
                onToggleExpand={() => toggleTaskExpanded(task.id)}
                onEdit={() => {
                  setEditingTask(task);
                  setShowTaskForm(true);
                }}
                onDelete={() => handleTaskDelete(task.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskForm
          locationId={locationId}
          task={editingTask}
          existingInstructions={
            editingTask ? instructionsByTask[editingTask.id] || [] : []
          }
          teleoperators={teleoperators}
          onSave={handleTaskSave}
          onCancel={() => {
            setShowTaskForm(false);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}
