"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TaskState, TASK_STATES } from "@/lib/taskMachine";

export type TaskAssignment = "oem_teleoperator" | "human";

export type TaskTemplateOption = {
  id: string;
  name: string;
  difficulty: "easy" | "mid" | "high";
  defaultAssignedTo: TaskAssignment;
};

export type TaskFormData = {
  name: string;
  type?: string;
  duration?: number;
  priority?: "low" | "medium" | "high";
  assignment: TaskAssignment;
  status: TaskState;
  templateId?: string;
};

type TaskFormProps = {
  open: boolean;
  title: string;
  description?: string;
  submitLabel?: string;
  initialValues?: Partial<TaskFormData>;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TaskFormData) => Promise<void> | void;
  templates?: TaskTemplateOption[];
};

const defaultValues: TaskFormData = {
  name: "",
  type: "general",
  duration: 60,
  priority: "medium",
  assignment: "oem_teleoperator",
  status: "scheduled",
  templateId: undefined,
};

export function TaskForm({
  open,
  onOpenChange,
  onSubmit,
  title,
  description,
  submitLabel = "Save task",
  initialValues,
  loading,
  templates,
}: TaskFormProps) {
  const [form, setForm] = useState<TaskFormData>({ ...defaultValues });

  const serializedInitialValues = useMemo(
    () => (initialValues ? JSON.stringify(initialValues) : null),
    [initialValues],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm({
      ...defaultValues,
      ...(initialValues ?? {}),
    });
  }, [open, serializedInitialValues, initialValues]);

  function handleChange<K extends keyof TaskFormData>(key: K, value: TaskFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {templates && templates.length ? (
            <div className="space-y-2">
              <Label htmlFor="task-template">Template</Label>
              <select
                id="task-template"
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                value={form.templateId ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  const selectedTemplate = templates.find((template) => template.id === value);
                  setForm((prev) => ({
                    ...prev,
                    templateId: value || undefined,
                    assignment: selectedTemplate?.defaultAssignedTo ?? prev.assignment,
                    name: prev.name || selectedTemplate?.name || "",
                  }));
                }}
              >
                <option value="">No template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} • {template.difficulty.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="task-name">Task name</Label>
            <Input
              id="task-name"
              required
              value={form.name}
              onChange={(event) => handleChange("name", event.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-type">Task type</Label>
              <Input
                id="task-type"
                placeholder="Routine cleaning"
                value={form.type ?? ""}
                onChange={(event) => handleChange("type", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-duration">Duration (minutes)</Label>
              <Input
                id="task-duration"
                type="number"
                min={1}
                value={form.duration ?? ""}
                onChange={(event) =>
                  handleChange("duration", Number(event.target.value) || 0)
                }
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-priority">Priority</Label>
              <select
                id="task-priority"
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                value={form.priority ?? "medium"}
                onChange={(event) =>
                  handleChange("priority", event.target.value as TaskFormData["priority"])
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-assignment">Assignment</Label>
              <select
                id="task-assignment"
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                value={form.assignment}
                onChange={(event) =>
                  handleChange("assignment", event.target.value as TaskAssignment)
                }
              >
                <option value="oem_teleoperator">Teleoperator</option>
                <option value="human">Human Cleaner</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-status">Status</Label>
            <select
              id="task-status"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
              value={form.status}
              onChange={(event) =>
                handleChange("status", event.target.value as TaskState)
              }
            >
              {TASK_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
