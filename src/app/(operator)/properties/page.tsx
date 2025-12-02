"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { doc, updateDoc } from "firebase/firestore";
import { Search } from "lucide-react";
import toast from "react-hot-toast";

import { PropertyCard } from "@/components/PropertyCard";
import { TaskList, type PortalTask } from "@/components/TaskList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useCollection";
import { useProperties } from "@/hooks/useProperties";
import { firestore } from "@/lib/firebaseClient";
import { TASK_TERMINAL_STATES, canTransition } from "@/lib/taskMachine";
import { incrementTemplateCompletion } from "@/lib/templates";
import { formatDateTime } from "@/lib/format";

export default function PropertiesPage() {
  const { user, claims, loading: authLoading } = useAuth();
  const [searchValue, setSearchValue] = useState("");
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const role = (claims?.role as string | undefined) ?? "operator";
  const partnerOrgId = claims?.partner_org_id as string | undefined;
  const isAdmin = role === "admin";

  const {
    properties: rawProperties,
    loading: propertiesLoading,
    error: propertiesError,
  } = useProperties({
    enabled: Boolean(user) && (isAdmin || Boolean(partnerOrgId)),
    partnerOrgId: isAdmin ? undefined : partnerOrgId,
  });

  const properties = rawProperties;

  const propertyNameMap = useMemo(
    () => new Map(properties.map((property) => [property.id, property.name])),
    [properties],
  );

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
        ? [{ field: "assigned_to", value: "oem_teleoperator" }]
        : []),
    ],
    orderByField: { field: "updatedAt", direction: "desc" },
    parse: (doc) =>
      ({
        id: doc.id,
        name: doc.name ?? doc.title ?? "Untitled task",
        locationId: doc.locationId ?? doc.propertyId,
        status: doc.status ?? doc.state ?? "scheduled",
        assignment: doc.assigned_to ?? "oem_teleoperator",
        duration: doc.duration ?? undefined,
        priority: doc.priority ?? undefined,
        assignedToUserId: doc.assignedToUserId ?? doc.assigneeId ?? null,
        updatedAt: doc.updatedAt ?? undefined,
        partnerOrgId: doc.partnerOrgId ?? doc.partner_org_id ?? undefined,
      }) as PortalTask,
  });

  const teleopTasks = useMemo(() => tasks.filter((task) => task.assignment === "oem_teleoperator"), [tasks]);

  const propertyIdsByTaskQuery = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return new Set<string>();
    return new Set(
      teleopTasks
        .filter((task) => (task.name ?? "").toLowerCase().includes(query))
        .map((task) => task.locationId),
    );
  }, [searchValue, teleopTasks]);

  const filteredProperties = useMemo(() => {
    if (!searchValue.trim()) return properties;
    const queryText = searchValue.trim().toLowerCase();
    return properties.filter((property) => {
      const matchesPropertyName = (property.name ?? "").toLowerCase().includes(queryText);
      return matchesPropertyName || propertyIdsByTaskQuery.has(property.id);
    });
  }, [properties, propertyIdsByTaskQuery, searchValue]);

  const recentTasks = useMemo(() => {
    return tasks
      .slice()
      .sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 6);
  }, [tasks]);

  async function updateTaskStatus(task: PortalTask, next: PortalTask["status"]) {
    if (TASK_TERMINAL_STATES.includes(task.status)) {
      return;
    }

    const allowedDirectTransition =
      (task.status === "available" && next === "in_progress") ||
      (task.status === "in_progress" && next === "completed");

    if (!allowedDirectTransition && !canTransition(task.status, next)) {
      toast.error("That transition isn’t allowed for this task.");
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
      if (next === "completed") {
        await incrementTemplateCompletion(task.templateId, task.assignment);
      }
      toast.success(
        next === "in_progress"
          ? `Task “${task.name}” started.`
          : `Task “${task.name}” marked complete.`,
      );
    } catch (error) {
      console.error("[operator] failed to update task", error);
      toast.error("Unable to update task status. Try again.");
    } finally {
      setUpdatingTaskId(null);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-neutral-500">Loading your workspace…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold">You need to sign in to view assigned properties.</p>
        <Button asChild>
          <Link href="/login">Go to login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-neutral-900">Your properties</h1>
            <p className="text-sm text-neutral-500">
              {isAdmin
                ? "Viewing all partner properties."
                : partnerOrgId
                  ? `Viewing properties for ${partnerOrgId}.`
                  : "No partner assigned to your account yet."}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <label className="relative block w-full min-w-[220px] sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                value={searchValue}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearchValue(event.currentTarget.value)}
                placeholder="Search tasks or properties…"
                className="pl-9"
              />
            </label>
            {isAdmin && (
              <Button asChild variant="outline">
                <Link href="/admin">Go to admin dashboard</Link>
              </Button>
            )}
            {!isAdmin && (
              <Button asChild variant="outline">
                <Link href="/tasks">View completed tasks</Link>
              </Button>
            )}
          </div>
        </div>

        {propertiesError ? (
          <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {propertiesError}
          </p>
        ) : null}

        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {propertiesLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-52 animate-pulse rounded-xl bg-neutral-100" />
              ))
            : filteredProperties.length ? (
                filteredProperties.map((property) => <PropertyCard key={property.id} property={property} />)
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-neutral-500">
                  <p className="text-sm font-medium">No assigned properties at this time.</p>
                  <p className="mt-1 text-xs">Reach out to your admin if you expect to see a location here.</p>
                </div>
              )}
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">Task queue</h2>
            <p className="text-sm text-neutral-500">Start or complete tasks assigned to teleoperators.</p>
          </div>
        </div>
        {tasksError ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {tasksError}
          </p>
        ) : null}
        {tasksLoading ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-md bg-neutral-100" />
            ))}
          </div>
        ) : teleopTasks.length ? (
          <div className="mt-6">
            <TaskList
              tasks={teleopTasks}
              showActions={!isAdmin}
              busyTaskId={updatingTaskId}
              onStartTask={(task) => updateTaskStatus(task, "in_progress")}
              onCompleteTask={(task) => updateTaskStatus(task, "completed")}
            />
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-sm text-neutral-500">
            All caught up. No teleoperator tasks are waiting for you right now.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">Recent updates</h2>
            <p className="text-sm text-neutral-500">Latest changes to tasks across your properties.</p>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {recentTasks.length ? (
            recentTasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-100 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-medium text-neutral-800">{task.name}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    <Badge variant="secondary">{task.status}</Badge>
                    <span>{formatDateTime(task.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-500">
                  <span>Location: {propertyNameMap.get(task.locationId) || task.locationId}</span>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/task/${task.id}`}>View</Link>
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-sm text-neutral-500">
              No recent task updates yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

