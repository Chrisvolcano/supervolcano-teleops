"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TaskState, TASK_TERMINAL_STATES } from "@/lib/taskMachine";
import { TaskAssignment } from "./TaskForm";

export type PortalTask = {
  id: string;
  name: string;
  locationId: string;
  status: TaskState;
  assignment: TaskAssignment;
  duration?: number;
  priority?: "low" | "medium" | "high";
  assignedToUserId?: string | null;
  updatedAt?: string;
  templateId?: string;
  templateDifficulty?: "easy" | "mid" | "high";
  partnerOrgId?: string;
};

const stateVariant: Record<TaskState, "default" | "secondary" | "destructive"> =
  {
    scheduled: "secondary",
    available: "default",
    claimed: "default",
    in_progress: "default",
    paused: "secondary",
    completed: "secondary",
    failed: "destructive",
    aborted: "destructive",
  };

type TaskListProps = {
  tasks: PortalTask[];
  className?: string;
  showActions?: boolean;
  busyTaskId?: string | null;
  onStartTask?: (task: PortalTask) => Promise<void> | void;
  onCompleteTask?: (task: PortalTask) => Promise<void> | void;
};

export function TaskList({
  tasks,
  className,
  showActions,
  busyTaskId,
  onStartTask,
  onCompleteTask,
}: TaskListProps) {
  if (!tasks.length) {
    return (
      <div
        className={cn(
          "flex min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground",
          className,
        )}
      >
        No tasks found.
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {tasks.map((task) => {
        const isTeleoperatorTask = task.assignment === "oem_teleoperator";
        const canStart =
          isTeleoperatorTask && task.status === "available" && onStartTask;
        const canComplete =
          isTeleoperatorTask && task.status === "in_progress" && onCompleteTask;

        return (
          <div
            key={task.id}
            className="flex flex-col gap-3 rounded-md border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{task.name}</h3>
                <Badge variant={stateVariant[task.status]}>{task.status}</Badge>
                <Badge variant={isTeleoperatorTask ? "default" : "secondary"}>
                  {isTeleoperatorTask ? "Teleoperator" : "Human"}
                </Badge>
                {task.priority && (
                  <Badge variant="secondary">Priority: {task.priority}</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Location: {task.locationId}
                {task.assignedToUserId && ` • Claimed by ${task.assignedToUserId}`}
              </p>
              {task.duration ? (
                <p className="text-xs text-muted-foreground">
                  Estimated duration: {task.duration} min
                </p>
              ) : null}
              {task.updatedAt && (
                <p className="text-xs text-neutral-400">
                  Updated {new Date(task.updatedAt).toLocaleString()}
                </p>
              )}
              {TASK_TERMINAL_STATES.includes(task.status) && (
                <p className="text-xs text-muted-foreground">Task is complete.</p>
              )}
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              {showActions && (
                <div className="flex gap-2">
                  {canStart ? (
                    <Button
                      size="sm"
                      onClick={() => onStartTask?.(task)}
                      variant="default"
                      disabled={busyTaskId === task.id}
                    >
                      Start
                    </Button>
                  ) : null}
                  {canComplete ? (
                    <Button
                      size="sm"
                      onClick={() => onCompleteTask?.(task)}
                      variant="secondary"
                      disabled={busyTaskId === task.id}
                    >
                      Complete
                    </Button>
                  ) : null}
                </div>
              )}
              <Button variant="outline" asChild size="sm">
                <Link href={`/task/${task.id}`}>Details</Link>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

