"use client";

import Link from "next/link";
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
import { incrementTemplateCompletion } from "@/lib/templates";

type TaskDoc = {
  id: string;
  name: string;
  description?: string;
  locationId: string;
  partnerOrgId: string;
  status: TaskState;
  assignment: "oem_teleoperator" | "human";
  duration?: number;
  scheduledAt?: string;
  assignedToUserId?: string | null;
  priority?: "low" | "medium" | "high";
  metadata?: Record<string, unknown>;
  templateId?: string;
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
        locationId: doc.locationId ?? doc.propertyId,
        partnerOrgId: doc.partnerOrgId,
        status: doc.status ?? doc.state ?? "scheduled",
        assignment: doc.assigned_to ?? "oem_teleoperator",
        duration: doc.duration ?? undefined,
        scheduledAt: doc.scheduledAt ?? undefined,
        assignedToUserId: doc.assignedToUserId ?? doc.assigneeId ?? null,
        priority: doc.priority ?? undefined,
        metadata: doc.metadata ?? undefined,
        templateId: doc.templateId ?? undefined,
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-neutral-500">Loading task…</p>
      </div>
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
    if (next === "completed") {
      await incrementTemplateCompletion(task.templateId, task.assignment);
    }
  }

  const transitions = task
    ? TASK_STATES.filter((next) => canTransition(task.status, next as TaskState))
    : [];

  const auditTimeline = auditLogs;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/properties")} className="text-sm text-neutral-500">
          ← Back to properties
        </Button>
        {task?.locationId && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/property/${task.locationId}`}>View location</Link>
          </Button>
        )}
      </div>

      <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        {taskLoading ? (
          <div className="space-y-3">
            <div className="h-10 w-2/3 animate-pulse rounded-lg bg-neutral-100" />
            <div className="h-6 w-1/2 animate-pulse rounded-lg bg-neutral-100" />
            <div className="h-24 animate-pulse rounded-xl bg-neutral-100" />
          </div>
        ) : task ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-neutral-900">{task.name}</h1>
              <Badge>{task.status}</Badge>
              <Badge variant={task.assignment === "oem_teleoperator" ? "default" : "secondary"}>
                {task.assignment === "oem_teleoperator" ? "Teleoperator" : "Human"}
              </Badge>
              {task.priority && <Badge variant="secondary">Priority: {task.priority}</Badge>}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-neutral-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase text-neutral-500">Property</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-neutral-700">{task.locationId}</CardContent>
              </Card>
              <Card className="border-neutral-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase text-neutral-500">Partner org</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-neutral-700">{task.partnerOrgId}</CardContent>
              </Card>
              <Card className="border-neutral-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase text-neutral-500">Duration</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-neutral-700">
                  {typeof task.duration === "number" && task.duration > 0
                    ? `${task.duration} min`
                    : "Not specified"}
                </CardContent>
              </Card>
            </div>
            {task.description ? (
              <p className="text-sm leading-relaxed text-neutral-600">{task.description}</p>
            ) : (
              <p className="text-sm text-neutral-500">No description provided.</p>
            )}
            {task.metadata && (
              <details className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
                <summary className="cursor-pointer font-medium text-neutral-800">Metadata</summary>
                <pre className="mt-3 whitespace-pre-wrap break-words rounded bg-neutral-100 p-3 text-xs">
                  {JSON.stringify(task.metadata, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ) : taskError ? (
          <p className="text-sm text-red-600">{taskError}</p>
        ) : null}
      </section>

      {!TASK_TERMINAL_STATES.includes(task?.status ?? "completed") && transitions.length > 0 ? (
        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle className="text-lg">Next steps</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {transitions.map((state) => (
              <Button
                key={state}
                size="sm"
                variant="outline"
                disabled={
                  !task ||
                  task.assignment !== "oem_teleoperator" ||
                  (!isAdmin && !["in_progress", "completed", "claimed"].includes(state))
                }
                onClick={() => transitionTask(state as TaskState)}
              >
                Mark as {state.replace("_", " ")}
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-neutral-900">Audit timeline</h2>
          <Button asChild variant="outline" size="sm">
            <Link href={`/property/${task?.locationId ?? ""}`}>Open location</Link>
          </Button>
        </div>
        {auditError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {auditError}
          </p>
        ) : auditLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-md bg-neutral-100" />
            ))}
          </div>
        ) : auditTimeline.length ? (
          <div className="space-y-3">
            {auditTimeline.map((log) => (
              <div key={log.id} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                  <span>{log.actorId}</span>
                </div>
                <p className="mt-2 font-medium text-neutral-800">{log.action}</p>
                {log.details && (
                  <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-neutral-100 p-3 text-xs">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">No audit events recorded yet.</p>
        )}
      </section>
    </div>
  );
}

