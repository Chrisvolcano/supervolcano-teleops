"use client";

import { useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { Filter, Loader2, Plus } from "lucide-react";
import toast from "react-hot-toast";

import { EmptyState } from "@/components/common/EmptyState";
import { TaskTemplateDrawer } from "@/components/admin/TaskTemplateDrawer";
import { TaskTemplateForm } from "@/components/admin/TaskTemplateForm";
import { TaskTemplatesTable } from "@/components/admin/TaskTemplatesTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { PortalTask } from "@/components/TaskList";
import { useTaskTemplates, type TaskTemplate } from "@/hooks/useTaskTemplates";
import { useTemplateUsage } from "@/hooks/useTemplateUsage";
import { useCollection } from "@/hooks/useCollection";
import { firestore } from "@/lib/firebaseClient";
import { formatDateTime } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const difficultyOptions = ["all", "easy", "mid", "high"] as const;
const assignmentOptions = ["all", "oem_teleoperator", "human"] as const;

type DifficultyFilter = (typeof difficultyOptions)[number];
type AssignmentFilter = (typeof assignmentOptions)[number];

export default function AdminTasksPage() {
  const { templates, loading: templatesLoading, error: templatesError } = useTaskTemplates();
  const {
    data: tasks,
    loading: tasksLoading,
  } = useCollection<PortalTask>({
    path: "tasks",
    enabled: true,
    parse: (doc) =>
      ({
        id: doc.id,
        name: doc.name ?? doc.title ?? "Untitled task",
        locationId: doc.locationId ?? doc.propertyId,
        status: doc.status ?? doc.state ?? "scheduled",
        assignment: doc.assigned_to ?? "oem_teleoperator",
        templateId: doc.templateId ?? undefined,
        partnerOrgId: doc.partnerOrgId ?? doc.partner_org_id ?? undefined,
        assignedToUserId: doc.assignedToUserId ?? doc.assigneeId ?? null,
        updatedAt: doc.updatedAt ?? undefined,
      }) as PortalTask,
  });

  const {
    data: properties,
    loading: propertiesLoading,
  } = useCollection<{ id: string; name: string; partnerOrgId?: string }>({
    path: "locations",
    enabled: true,
    parse: (doc) => ({
      id: doc.id,
      name: doc.name ?? "Untitled property",
      partnerOrgId: doc.partnerOrgId ?? doc.partner_org_id ?? undefined,
    }),
  });

  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");

  const propertyUsageCounts = useMemo(() => {
    const counts: Record<string, Set<string>> = {};
    tasks.forEach((task) => {
      if (!task.templateId) return;
      if (!counts[task.templateId]) {
        counts[task.templateId] = new Set();
      }
      counts[task.templateId]?.add(task.locationId);
    });
    return Object.fromEntries(
      Object.entries(counts).map(([templateId, propertySet]) => [templateId, propertySet.size]),
    );
  }, [tasks]);

  const propertyNameMap = useMemo(
    () => new Map(properties.map((property) => [property.id, property.name])),
    [properties],
  );

  const teleopCompletedTasks = useMemo(
    () => tasks.filter((task) => task.assignment === "oem_teleoperator" && task.status === "completed"),
    [tasks],
  );

  const humanCompletedTasks = useMemo(
    () => tasks.filter((task) => task.assignment === "human" && task.status === "completed"),
    [tasks],
  );

  const completionsByOrg = useMemo(() => {
    const entries = new Map<string, { count: number; lastCompleted?: string }>();
    teleopCompletedTasks.forEach((task) => {
      const orgId = task.partnerOrgId ?? "unknown";
      const record = entries.get(orgId) ?? { count: 0, lastCompleted: undefined };
      record.count += 1;
      if (task.updatedAt && (!record.lastCompleted || task.updatedAt > record.lastCompleted)) {
        record.lastCompleted = task.updatedAt;
      }
      entries.set(orgId, record);
    });
    return Array.from(entries.entries()).sort((a, b) => b[1].count - a[1].count);
  }, [teleopCompletedTasks]);

  const completionsByProperty = useMemo(() => {
    const entries = new Map<string, { count: number; orgId?: string; lastCompleted?: string }>();
    teleopCompletedTasks.forEach((task) => {
      const record = entries.get(task.locationId) ?? {
        count: 0,
        orgId: task.partnerOrgId,
        lastCompleted: undefined,
      };
      record.count += 1;
      if (task.updatedAt && (!record.lastCompleted || task.updatedAt > record.lastCompleted)) {
        record.lastCompleted = task.updatedAt;
      }
      entries.set(task.locationId, record);
    });
    return Array.from(entries.entries()).sort((a, b) => b[1].count - a[1].count);
  }, [teleopCompletedTasks]);

  const latestTeleopCompletions = useMemo(() => {
    return teleopCompletedTasks
      .slice()
      .sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 8);
  }, [teleopCompletedTasks]);

  const partnerCount = completionsByOrg.length;

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      if (!showInactive && !template.isActive) return false;
      if (difficultyFilter !== "all" && template.difficulty !== difficultyFilter) return false;
      if (assignmentFilter !== "all" && template.defaultAssignedTo !== assignmentFilter) return false;
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        return template.name.toLowerCase().includes(query);
      }
      return true;
    });
  }, [templates, showInactive, difficultyFilter, assignmentFilter, search]);

  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { usage, loading: usageLoading } = useTemplateUsage(drawerOpen ? selectedTemplate?.id ?? null : null);

  const [editTemplate, setEditTemplate] = useState<TaskTemplate | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  function handleSelectTemplate(template: TaskTemplate) {
    setSelectedTemplate(template);
    setDrawerOpen(true);
  }

  function handleEdit(template: TaskTemplate) {
    setEditTemplate(template);
    setEditOpen(true);
  }

  async function handleToggleActive(template: TaskTemplate) {
    try {
      await updateDoc(doc(firestore, "taskTemplates", template.id), {
        isActive: !template.isActive,
      });
      toast.success(template.isActive ? "Template disabled" : "Template enabled");
    } catch (error) {
      toast.error("Unable to update template");
      console.error(error);
    }
  }

  async function handleSaveTemplate(values: {
    name: string;
    difficulty: TaskTemplate["difficulty"];
    defaultAssignedTo: TaskTemplate["defaultAssignedTo"];
    isActive: boolean;
  }) {
    if (!editTemplate) return;
    setSavingTemplate(true);
    try {
      await updateDoc(doc(firestore, "taskTemplates", editTemplate.id), {
        name: values.name,
        difficulty: values.difficulty,
        defaultAssignedTo: values.defaultAssignedTo,
        isActive: values.isActive,
      });
      toast.success("Template updated");
      setEditOpen(false);
    } catch (error) {
      toast.error("Failed to update template");
      console.error(error);
    } finally {
      setSavingTemplate(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-widest text-neutral-400">Admin / Tasks</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-neutral-900">Task Templates</h1>
            <p className="text-sm text-neutral-500">
              Track difficulty, assignment mix, and where templates are used across properties.
            </p>
          </div>
          <Button size="sm" disabled>
            <Plus className="mr-2 h-4 w-4" /> New template
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle className="text-sm uppercase text-neutral-500">Teleoperator completions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-neutral-900">{teleopCompletedTasks.length}</p>
            <p className="text-xs text-neutral-500">Completed tasks assigned to teleoperators across all partners.</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle className="text-sm uppercase text-neutral-500">Human cleaner completions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-neutral-900">{humanCompletedTasks.length}</p>
            <p className="text-xs text-neutral-500">Completed tasks assigned to human cleaners.</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle className="text-sm uppercase text-neutral-500">Active partner orgs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-neutral-900">{partnerCount}</p>
            <p className="text-xs text-neutral-500">Partners with at least one teleoperator task completion.</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-neutral-200">
        <CardHeader className="pb-0">
          <CardTitle className="text-lg font-semibold text-neutral-900">Completions by partner organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {tasksLoading || propertiesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-12 animate-pulse rounded-md bg-neutral-100" />
              ))}
            </div>
          ) : completionsByOrg.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead className="text-right">Teleoperator completions</TableHead>
                  <TableHead className="text-right">Most recent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completionsByOrg.map(([orgId, record]) => (
                  <TableRow key={orgId}>
                    <TableCell>
                      <Badge variant="secondary">{orgId}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-neutral-800">{record.count}</TableCell>
                    <TableCell className="text-right text-sm text-neutral-600">
                      {formatDateTime(record.lastCompleted)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="No teleoperator completions yet"
              description="Task activity will display here once teleoperators complete assignments."
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-neutral-200">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg font-semibold text-neutral-900">Top properties by teleoperator output</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {tasksLoading || propertiesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-12 animate-pulse rounded-md bg-neutral-100" />
                ))}
              </div>
            ) : completionsByProperty.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead className="text-right">Completions</TableHead>
                    <TableHead className="text-right">Most recent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completionsByProperty.slice(0, 8).map(([propertyId, record]) => (
                    <TableRow key={propertyId}>
                      <TableCell className="text-sm font-medium text-neutral-800">
                        {propertyNameMap.get(propertyId) ?? propertyId}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.orgId ?? "unknown"}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium text-neutral-800">{record.count}</TableCell>
                      <TableCell className="text-right text-sm text-neutral-600">
                        {formatDateTime(record.lastCompleted)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                title="No teleoperator completions yet"
                description="Once tasks are completed these properties will appear here."
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-neutral-200">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg font-semibold text-neutral-900">Recent teleoperator completions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {tasksLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-12 animate-pulse rounded-md bg-neutral-100" />
                ))}
              </div>
            ) : latestTeleopCompletions.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestTeleopCompletions.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="text-sm font-medium text-neutral-800">{task.name}</TableCell>
                      <TableCell className="text-sm text-neutral-600">
                        {propertyNameMap.get(task.locationId) ?? task.locationId}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{task.partnerOrgId ?? "unknown"}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-neutral-600">{formatDateTime(task.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                title="No teleoperator completions yet"
                description="Once teleoperators complete tasks they will show here."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-neutral-200">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-neutral-400" />
              <span className="text-sm font-medium text-neutral-700">Filters</span>
            </div>
            <select
              value={difficultyFilter}
              onChange={(event) => setDifficultyFilter(event.target.value as DifficultyFilter)}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
            >
              {difficultyOptions.map((option) => (
                <option key={option} value={option}>
                  Difficulty: {option}
                </option>
              ))}
            </select>
            <select
              value={assignmentFilter}
              onChange={(event) => setAssignmentFilter(event.target.value as AssignmentFilter)}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
            >
              {assignmentOptions.map((option) => (
                <option key={option} value={option}>
                  Assignment: {option}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-neutral-600">
              <Switch checked={showInactive} onCheckedChange={(value) => setShowInactive(Boolean(value))} />
              Show inactive
            </label>
            <div className="ml-auto flex items-center gap-2">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search templates…"
                className="w-[220px]"
              />
            </div>
          </div>

          {templatesError ? (
            <EmptyState title="Unable to load templates" description={templatesError} />
          ) : templatesLoading || tasksLoading ? (
            <div className="flex min-h-[200px] items-center justify-center text-neutral-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filteredTemplates.length ? (
            <TaskTemplatesTable
              templates={filteredTemplates}
              propertyUsageCounts={propertyUsageCounts}
              onSelect={handleSelectTemplate}
              onEdit={handleEdit}
              onToggleActive={handleToggleActive}
            />
          ) : (
            <EmptyState title="No templates match the filters" description="Adjust filters to see other templates." />
          )}
        </CardContent>
      </Card>

      <TaskTemplateDrawer
        template={selectedTemplate}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        loading={usageLoading}
        usage={usage}
      />

      <TaskTemplateForm
        open={editOpen}
        onOpenChange={setEditOpen}
        template={editTemplate}
        onSubmit={handleSaveTemplate}
        loading={savingTemplate}
      />
    </div>
  );
}
