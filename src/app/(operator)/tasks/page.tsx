"use client";

import { useMemo } from "react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useCollection";
import { useProperties } from "@/hooks/useProperties";
import type { PortalTask } from "@/components/TaskList";
import { formatDateTime } from "@/lib/format";

export default function OperatorTasksPage() {
  const { user, claims, loading } = useAuth();
  const role = (claims?.role as string | undefined) ?? "operator";
  const partnerOrgId = claims?.partner_org_id as string | undefined;
  const isAdmin = role === "admin";

  const {
    properties,
    loading: propertiesLoading,
  } = useProperties({
    enabled: Boolean(user),
    includeInactive: true,
    partnerOrgId: isAdmin ? undefined : partnerOrgId,
  });

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
    enabled: Boolean(user),
    whereEqual: [
      ...(partnerOrgId && !isAdmin ? [{ field: "partnerOrgId", value: partnerOrgId }] : []),
      ...(!isAdmin ? [{ field: "assigned_to", value: "oem_teleoperator" }] : []),
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

  const completedTasks = useMemo(
    () => tasks.filter((task) => task.status === "completed"),
    [tasks],
  );

  const myCompletedTasks = useMemo(
    () => completedTasks.filter((task) => task.assignedToUserId === user?.uid),
    [completedTasks, user?.uid],
  );

  const orgCompletedTasks = useMemo(
    () => (isAdmin ? completedTasks : completedTasks.filter((task) => task.partnerOrgId === partnerOrgId)),
    [completedTasks, isAdmin, partnerOrgId],
  );

  const latestCompletedTasks = useMemo(() => {
    return completedTasks
      .slice()
      .sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 10);
  }, [completedTasks]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-neutral-500">Loading tasks…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold">You need to sign in to view tasks.</p>
        <Button asChild>
          <Link href="/login">Go to login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle className="text-sm uppercase text-neutral-500">My completed tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-neutral-900">{myCompletedTasks.length}</p>
            <p className="text-xs text-neutral-500">Tasks completed and attributed to your operator account.</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle className="text-sm uppercase text-neutral-500">
              {isAdmin ? "All partner completions" : "Org completions"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-neutral-900">{orgCompletedTasks.length}</p>
            <p className="text-xs text-neutral-500">
              Completed teleoperator tasks {isAdmin ? "across all partners" : "for your organization"}.
            </p>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle className="text-sm uppercase text-neutral-500">Latest completion</CardTitle>
          </CardHeader>
          <CardContent>
            {latestCompletedTasks.length ? (
              <div className="space-y-1 text-sm text-neutral-600">
                <p className="font-medium text-neutral-900">{latestCompletedTasks[0].name}</p>
                <p className="text-xs text-neutral-500">
                  {formatDateTime(latestCompletedTasks[0].updatedAt)} • Property:
                  {" "}
                  {propertyNameMap.get(latestCompletedTasks[0].locationId) ?? latestCompletedTasks[0].locationId}
                </p>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">No task completions yet.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">My completed tasks</h2>
            <p className="text-sm text-neutral-500">Only tasks attributed directly to your teleoperator account.</p>
          </div>
        </div>
        <CardContent className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-0">
          {tasksError ? (
            <p className="p-4 text-sm text-red-600">{tasksError}</p>
          ) : tasksLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-md bg-neutral-100" />
              ))}
            </div>
          ) : myCompletedTasks.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myCompletedTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="text-sm font-medium text-neutral-800">{task.name}</TableCell>
                    <TableCell className="text-sm text-neutral-600">
                      {propertyNameMap.get(task.locationId) ?? task.locationId}
                    </TableCell>
                    <TableCell className="text-sm text-neutral-600">{formatDateTime(task.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-4 text-sm text-neutral-500">You haven’t completed any tasks yet.</p>
          )}
        </CardContent>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">
              {isAdmin ? "Teleoperator completions across partners" : "Org-wide completions"}
            </h2>
            <p className="text-sm text-neutral-500">Completed teleoperator tasks grouped by property.</p>
          </div>
        </div>
        <CardContent className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-0">
          {tasksError ? (
            <p className="p-4 text-sm text-red-600">{tasksError}</p>
          ) : tasksLoading || propertiesLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-md bg-neutral-100" />
              ))}
            </div>
          ) : orgCompletedTasks.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgCompletedTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="text-sm font-medium text-neutral-800">{task.name}</TableCell>
                    <TableCell className="text-sm text-neutral-600">
                      {propertyNameMap.get(task.locationId) ?? task.locationId}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{task.partnerOrgId ?? "unknown"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-neutral-600">{formatDateTime(task.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-4 text-sm text-neutral-500">No completed teleoperator tasks yet.</p>
          )}
        </CardContent>
      </section>
    </div>
  );
}
