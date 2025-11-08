"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";

import { SessionHUD, type Session } from "@/components/SessionHUD";
import { TaskList, type PortalTask } from "@/components/TaskList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useDoc } from "@/hooks/useDoc";
import { useCollection } from "@/hooks/useCollection";
import { firestore } from "@/lib/firebaseClient";
import { TaskState, TASK_TERMINAL_STATES, canTransition } from "@/lib/taskMachine";

type PropertyDoc = {
  id: string;
  name: string;
  partnerOrgId: string;
  address?: string;
  status?: string;
  description?: string;
  images?: string[];
  activeSessionId?: string | null;
};

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading, claims } = useAuth();
  const role = (claims?.role as string | undefined) ?? "operator";
  const partnerOrgIdClaim = claims?.partner_org_id as string | undefined;
  const isAdmin = role === "admin";

  const propertyId = params?.id;

  const {
    data: property,
    loading: propertyLoading,
    error: propertyError,
  } = useDoc<PropertyDoc>({
    path: "properties",
    docId: propertyId!,
    enabled: Boolean(propertyId),
    parse: (doc) =>
      ({
        id: doc.id,
        name: doc.name ?? "Unnamed property",
        description: doc.description ?? undefined,
        address: doc.address ?? doc.location ?? undefined,
        partnerOrgId: doc.partnerOrgId ?? "unknown",
        status: doc.status ?? "offline",
        images: doc.images ?? [],
        activeSessionId: doc.activeSessionId ?? null,
      }) as PropertyDoc,
  });

  const {
    data: tasks,
    loading: tasksLoading,
    error: tasksError,
  } = useCollection<PortalTask>({
    path: "tasks",
    enabled: Boolean(propertyId),
    whereEqual: [
      { field: "propertyId", value: propertyId },
      ...(!isAdmin
        ? [{ field: "assigned_to", value: "teleoperator" }]
        : []),
      ...(partnerOrgIdClaim && !isAdmin
        ? [{ field: "partnerOrgId", value: partnerOrgIdClaim }]
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

  async function updateTaskStatus(task: PortalTask, next: TaskState) {
    if (TASK_TERMINAL_STATES.includes(task.status)) {
      return;
    }

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

  const {
    data: activeSession,
    error: sessionError,
  } = useDoc<Session>({
    path: "sessions",
    docId: property?.activeSessionId ?? "",
    enabled: Boolean(property?.activeSessionId),
    parse: (doc) =>
      ({
        id: doc.id,
        operatorId: doc.operatorId,
        partnerOrgId: doc.partnerOrgId,
        taskId: doc.taskId ?? null,
        allowedHours: doc.allowedHours ?? 0,
        startedAt: doc.startedAt,
        endedAt: doc.endedAt ?? null,
        status: doc.status ?? "pending",
      }) as Session,
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

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <Button variant="outline" onClick={() => router.back()} className="w-fit">
        ← Back
      </Button>

      <section className="space-y-4">
        {propertyLoading && (
          <div className="space-y-2">
            <div className="h-10 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-24 animate-pulse rounded bg-muted" />
          </div>
        )}

        {propertyError && (
          <p className="text-sm text-destructive">{propertyError}</p>
        )}

        {property && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold">{property.name}</h1>
              {property.status && <Badge>{property.status}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              Partner org: {property.partnerOrgId}
            </p>
            {property.address && (
              <p className="text-sm text-muted-foreground">{property.address}</p>
            )}
            {property.images && property.images.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {property.images.map((imageUrl) => (
                  <div key={imageUrl} className="relative h-48 w-full overflow-hidden rounded-lg">
                    <Image
                      src={imageUrl}
                      alt={`${property.name} image`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
            {property.description && (
              <p className="text-base leading-relaxed">{property.description}</p>
            )}
          </>
        )}
      </section>

      {sessionError && (
        <p className="text-sm text-destructive">{String(sessionError)}</p>
      )}
      <SessionHUD
        session={property?.activeSessionId ? activeSession ?? null : null}
      />

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Tasks</h2>
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
            onStartTask={(task) => updateTaskStatus(task, "in_progress")}
            onCompleteTask={(task) => updateTaskStatus(task, "completed")}
          />
        )}
      </section>
    </main>
  );
}

