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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { PortalTask } from "@/components/TaskList";
import { useTaskTemplates, type TaskTemplate } from "@/hooks/useTaskTemplates";
import { useTemplateUsage } from "@/hooks/useTemplateUsage";
import { useCollection } from "@/hooks/useCollection";
import { firestore } from "@/lib/firebaseClient";

const difficultyOptions = ["all", "easy", "mid", "high"] as const;
const assignmentOptions = ["all", "teleoperator", "human"] as const;

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
        propertyId: doc.propertyId,
        status: doc.status ?? doc.state ?? "scheduled",
        assignment: doc.assigned_to ?? "teleoperator",
        templateId: doc.templateId ?? undefined,
      }) as PortalTask,
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
      counts[task.templateId]?.add(task.propertyId);
    });
    return Object.fromEntries(
      Object.entries(counts).map(([templateId, propertySet]) => [templateId, propertySet.size]),
    );
  }, [tasks]);

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
