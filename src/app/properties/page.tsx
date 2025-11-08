"use client";

import { useState } from "react";
import Link from "next/link";
import { doc, updateDoc } from "firebase/firestore";

import { PropertyCard, type Property } from "@/components/PropertyCard";
import { TaskList, type PortalTask } from "@/components/TaskList";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useCollection";
import { firestore } from "@/lib/firebaseClient";
import { TASK_TERMINAL_STATES, canTransition } from "@/lib/taskMachine";

export default function PropertiesPage() {
  const { user, claims, loading: authLoading } = useAuth();
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const role = (claims?.role as string | undefined) ?? "operator";
  const partnerOrgId = claims?.partner_org_id as string | undefined;
  const isAdmin = role === "admin";

  const {
    data: properties,
    loading: propertiesLoading,
    error: propertiesError,
  } = useCollection<Property>({
    path: "properties",
    enabled: Boolean(user) && (isAdmin || Boolean(partnerOrgId)),
    whereEqual:
      !isAdmin && partnerOrgId
        ? [{ field: "partnerOrgId", value: partnerOrgId }]
        : undefined,
    parse: (doc) =>
      ({
        id: doc.id,
        name: doc.name ?? "Untitled property",
        partnerOrgId: doc.partnerOrgId ?? "unknown",
        address: doc.address ?? doc.location ?? undefined,
        status: doc.status ?? undefined,
        images: doc.images ?? [],
        taskCount: doc.taskCount ?? doc.activeTasks ?? 0,
      }) as Property,
  });

  const {
    data: tasks,
    loading: tasksLoading,
    error: tasksError,
  } = useCollection<PortalTask>({
    path: "tasks",
    enabled: Boolean(user) && (isAdmin || Boolean(partnerOrgId)),
    whereEqual: [
      ...(partnerOrgId && !isAdmin
        ? [{ field: "partnerOrgId", value: partnerOrgId }]
        : []),
      ...(!isAdmin
        ? [{ field: "assigned_to", value: "teleoperator" }]
        : []),
    ],
    parse: (doc) =>
      ({
        id: doc.id,
        name: doc.name ?? doc.title ?? "Untitled task",
        propertyId: doc.propertyId,
        status: doc.status ?? doc.state ?? "scheduled",
        assignment: doc.assigned_to ?? "teleoperator",
        duration: doc.duration ?? undefined,
        priority: doc.priority ?? undefined,
        assignedToUserId: doc.assignedToUserId ?? doc.assigneeId ?? null,
        updatedAt: doc.updatedAt ?? undefined,
      }) as PortalTask,
  });

  async function updateTaskStatus(task: PortalTask, next: PortalTask["status"]) {
    if (TASK_TERMINAL_STATES.includes(task.status)) {
      return;
    }

    const allowedDirectTransition =
      (task.status === "available" && next === "in_progress") ||
      (task.status === "in_progress" && next === "completed");

    if (!allowedDirectTransition && !canTransition(task.status, next)) {
      return;
    }

    setUpdatingTaskId(task.id);
    try {
      const taskRef = doc(firestore, "tasks", task.id);
      await updateDoc(taskRef, {
        status: next,
        state: next,
        updatedAt: new Date().toISOString(),
        assignedToUserId: user?.uid ?? null,
      });
    } finally {
      setUpdatingTaskId(null);
    }
  }

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading account…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg font-semibold">You must sign in to view properties.</p>
        <Button asChild>
          <Link href="/login">Go to login</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Properties</h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? "Viewing all partner properties."
                : `Viewing properties for org ${partnerOrgId ?? "assigned"}.`}
            </p>
          </div>
          {isAdmin && (
            <Button asChild>
              <Link href="/admin">Go to admin dashboard</Link>
            </Button>
          )}
        </div>
        {propertiesError && (
          <p className="text-sm text-destructive">{propertiesError}</p>
        )}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {propertiesLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-52 animate-pulse rounded-lg bg-muted"
                />
              ))
            : properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Open Tasks</h2>
        {tasksError && <p className="text-sm text-destructive">{tasksError}</p>}
        {tasksLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : (
          <TaskList
            tasks={tasks}
            showActions={!isAdmin}
            busyTaskId={updatingTaskId}
            onStartTask={(task) => updateTaskStatus(task, "in_progress")}
            onCompleteTask={(task) => updateTaskStatus(task, "completed")}
          />
        )}
      </section>
    </main>
  );
}

