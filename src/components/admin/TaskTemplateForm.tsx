"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TaskTemplate } from "@/hooks/useTaskTemplates";

import { Checkbox } from "@/components/ui/checkbox";

const difficulties = [
  { value: "easy", label: "Easy" },
  { value: "mid", label: "Mid" },
  { value: "high", label: "High" },
] as const;

type TaskTemplateFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TaskTemplate | null;
  onSubmit: (payload: {
    name: string;
    difficulty: TaskTemplate["difficulty"];
    defaultAssignedTo: TaskTemplate["defaultAssignedTo"];
    isActive: boolean;
  }) => Promise<void> | void;
  loading?: boolean;
};

export function TaskTemplateForm({ open, onOpenChange, template, onSubmit, loading }: TaskTemplateFormProps) {
  const [name, setName] = useState(template?.name ?? "");
  const [difficulty, setDifficulty] = useState<TaskTemplate["difficulty"]>(template?.difficulty ?? "easy");
  const [defaultAssignedTo, setDefaultAssignedTo] = useState<TaskTemplate["defaultAssignedTo"]>(
    template?.defaultAssignedTo ?? "oem_teleoperator",
  );
  const [isActive, setIsActive] = useState(template?.isActive ?? true);

  useEffect(() => {
    setName(template?.name ?? "");
    setDifficulty(template?.difficulty ?? "easy");
    setDefaultAssignedTo(template?.defaultAssignedTo ?? "oem_teleoperator");
    setIsActive(template?.isActive ?? true);
  }, [template, open]);

  const title = useMemo(() => (template ? `Edit ${template.name}` : "New template"), [template]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({ name, difficulty, defaultAssignedTo, isActive });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Configure the defaults for this task template.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="template-name">Task name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Difficulty</Label>
            <div className="flex flex-wrap gap-3">
              {difficulties.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm text-neutral-600">
                  <input
                    type="radio"
                    name="template-difficulty"
                    value={option.value}
                    checked={difficulty === option.value}
                    onChange={() => setDifficulty(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Default assignment</Label>
            <div className="flex flex-wrap gap-3">
              {(["oem_teleoperator", "human"] as const).map((assignment) => (
                <label key={assignment} className="flex items-center gap-2 text-sm text-neutral-600">
                  <input
                    type="radio"
                    name="template-assignment"
                    value={assignment}
                    checked={defaultAssignedTo === assignment}
                    onChange={() => setDefaultAssignedTo(assignment)}
                  />
                  {assignment === "oem_teleoperator" ? "Teleoperator" : "Human"}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={isActive} onCheckedChange={(checked) => setIsActive(Boolean(checked))} id="template-active" />
            <Label htmlFor="template-active" className="text-sm text-neutral-600">
              Template is active
            </Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
