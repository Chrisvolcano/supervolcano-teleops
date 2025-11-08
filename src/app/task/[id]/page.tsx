"use client";

import { useParams, useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useDoc } from "@/hooks/useDoc";
import { useCollection } from "@/hooks/useCollection";
import {
  TASK_STATES,
  TASK_TERMINAL_STATES,
  canTransition,
  TaskState,
} from "@/lib/taskMachine";
import { firestore } from "@/lib/firebaseClient";

type TaskDoc = {
  id: string;
  name: string;
  description?: string;
  propertyId: string;
  partnerOrgId: string;
  status: TaskState;
  assignment: "teleoperator" | "human";
  duration?: number;
  scheduledAt?: string;
  assignedToUserId?: string | null;
  priority?: "low" | "medium" | "high";
  metadata?: Record<string, unknown>;
};

type AuditLogDoc = {
  id: string;
  entityId: string;
  entityType: string;
  action: string;
  actorId: string;
  createdAt: string;
  details?: Record<string, unknown>;
};

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading, claims } = useAuth();
  const role = (claims?.role as string | undefined) ?? "operator";
  const isAdmin = role === "admin";

  const taskId = params?.id;

  const {
    data: task,
    loading: taskLoading,
    error: taskError,
  } = useDoc<TaskDoc>({
    path: "tasks",
    docId: taskId ?? "",
    enabled: Boolean(taskId),
    parse: (doc) =>
      ({
        id: doc.id,
        name: doc.name ?? doc.title ?? "Untitled task",
        description: doc.description ?? undefined,
        propertyId: doc.propertyId,
        partnerOrgId: doc.partnerOrgId,
        status: doc.status ?? doc.state ?? "scheduled",
        assignment: doc.assigned_to ?? "teleoperator",
        duration: doc.duration ?? undefined,
        scheduledAt: doc.scheduledAt ?? undefined,
        assignedToUserId: doc.assignedToUserId ?? doc.assigneeId ?? null,
        priority: doc.priority ?? undefined,
        metadata: doc.metadata ?? undefined,
      }) as TaskDoc,
  });

  const {
    data: auditLogs,
    loading: auditLoading,
    error: auditError,
  } = useCollection<AuditLogDoc>({
    path: "auditLogs",
    enabled: Boolean(taskId),
    whereEqual: [{ field: "entityId", value: taskId }],
    parse: (doc) =>
      ({
        id: doc.id,
        entityId: doc.entityId,
        entityType: doc.entityType,
        action: doc.action,
        actorId: doc.actorId,
        createdAt: doc.createdAt,
        details: doc.details ?? undefined,
      }) as AuditLogDoc,
    orderByField: { field: "createdAt", direction: "desc" },
  });

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading account…</p>
      </main>
    );
  }

  if (!user) {
    router.replace("/login");
    return null;
  }

  async function transitionTask(next: TaskState) {
    if (!task) return;
    if (TASK_TERMINAL_STATES.includes(task.status)) return;

    const allowedDirectTransition =
      (task.status === "available" && next === "in_progress") ||
      (task.status === "in_progress" && next === "completed");

    if (!allowedDirectTransition && !canTransition(task.status, next)) {
      return;
    }

    const taskRef = doc(firestore, "tasks", task.id);
    await updateDoc(taskRef, {
      status: next,
      state: next,
      updatedAt: new Date().toISOString(),
      assignedToUserId: user?.uid ?? null,
    });
  }

  const transitions = task
    ? TASK_STATES.filter((next) => canTransition(task.status, next as TaskState))
    : [];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10">
      <Button variant="outline" onClick={() => router.back()} className="w-fit">
        ← Back
      </Button>

      <section className="space-y-4">
        {taskLoading && (
          <div className="space-y-2">
            <div className="h-10 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-24 animate-pulse rounded bg-muted" />
          </div>
        )}
        {taskError && <p className="text-sm text-destructive">{taskError}</p>}

        {task && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold">{task.name}</h1>
              <Badge>{task.status}</Badge>
              <Badge variant={task.assignment === "teleoperator" ? "default" : "secondary"}>
                {task.assignment === "teleoperator" ? "Teleoperator" : "Human"}
              </Badge>
              {task.priority && <Badge variant="secondary">{task.priority}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              Property: {task.propertyId} • Partner org: {task.partnerOrgId}
            </p>
            {typeof task.duration === "number" && task.duration > 0 && (
              <p className="text-sm text-muted-foreground">
                Estimated duration: {task.duration} min
              </p>
            )}
            {task.assignedToUserId && (
              <p className="text-sm text-muted-foreground">
                Claimed by {task.assignedToUserId}
              </p>
            )}
            {task.scheduledAt && (
              <p className="text-sm text-muted-foreground">
                Scheduled {new Date(task.scheduledAt).toLocaleString()}
              </p>
            )}
            {task.description && (
              <p className="text-base leading-relaxed">{task.description}</p>
            )}
            {task.metadata && (
              <Card>
                <CardHeader>
                  <CardTitle>Metadata</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap break-words rounded bg-muted p-4 text-xs">
                    {JSON.stringify(task.metadata, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
            {!TASK_TERMINAL_STATES.includes(task.status) && transitions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Possible transitions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {transitions.map((state) => (
                    <Button
                      key={state}
                      size="sm"
                      variant="outline"
                      disabled={
                        task.assignment !== "teleoperator" ||
                        (!isAdmin &&
                          !["in_progress", "completed", "claimed"].includes(state))
                      }
                      onClick={() => transitionTask(state as TaskState)}
                    >
                      {state}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Audit log</h2>
        {auditError && <p className="text-sm text-destructive">{auditError}</p>}
        {auditLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-md bg-muted"
              />
            ))}
          </div>
        ) : auditLogs.length ? (
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <Card key={log.id}>
                <CardContent className="space-y-1 py-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{log.action}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    by {log.actorId} • {log.entityType}
                  </p>
                  {log.details && (
                    <pre className="whitespace-pre-wrap break-words rounded bg-muted p-3 text-xs">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No audit entries yet.</p>
        )}
      </section>
    </main>
  );
}

