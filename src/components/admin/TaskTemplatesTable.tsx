"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TaskTemplate } from "@/hooks/useTaskTemplates";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

const difficultyStyles: Record<"easy" | "mid" | "high", string> = {
  easy: "bg-emerald-100 text-emerald-700",
  mid: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

type TaskTemplatesTableProps = {
  templates: TaskTemplate[];
  propertyUsageCounts: Record<string, number>;
  onSelect: (template: TaskTemplate) => void;
  onEdit: (template: TaskTemplate) => void;
  onToggleActive: (template: TaskTemplate) => void;
};

export function TaskTemplatesTable({
  templates,
  propertyUsageCounts,
  onSelect,
  onEdit,
  onToggleActive,
}: TaskTemplatesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Difficulty</TableHead>
          <TableHead>Assignment</TableHead>
          <TableHead className="text-center">Teleop assigned</TableHead>
          <TableHead className="text-center">Teleop completed</TableHead>
          <TableHead className="text-center">Human assigned</TableHead>
          <TableHead className="text-center">Human completed</TableHead>
          <TableHead className="text-center">Properties in use</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {templates.map((template) => {
          const propertyCount = propertyUsageCounts[template.id] ?? 0;
          return (
            <TableRow
              key={template.id}
              className="cursor-pointer transition hover:bg-neutral-50"
              onClick={() => onSelect(template)}
            >
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium text-neutral-900">{template.name}</span>
                  {!template.isActive && <span className="text-xs text-neutral-500">Inactive</span>}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={cn("capitalize", difficultyStyles[template.difficulty])}>
                  {template.difficulty}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={template.defaultAssignedTo === "oem_teleoperator" ? "default" : "secondary"}>
                  {template.defaultAssignedTo === "oem_teleoperator" ? "Teleoperator" : "Human"}
                </Badge>
              </TableCell>
              <TableCell className="text-center text-sm font-medium">
                {template.stats.assignedTeleop}
              </TableCell>
              <TableCell className="text-center text-sm">
                {template.stats.completedTeleop}
              </TableCell>
              <TableCell className="text-center text-sm font-medium">
                {template.stats.assignedHuman}
              </TableCell>
              <TableCell className="text-center text-sm">
                {template.stats.completedHuman}
              </TableCell>
              <TableCell className="text-center text-sm">{propertyCount}</TableCell>
              <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => onEdit(template)}>
                    Edit
                  </Button>
                  <ConfirmDialog
                    title={template.isActive ? "Disable template" : "Enable template"}
                    description={
                      template.isActive
                        ? "Disabling prevents new tasks from using this template. Existing tasks remain unaffected."
                        : "Enable the template so it can be assigned again."
                    }
                    confirmLabel={template.isActive ? "Disable" : "Enable"}
                    destructive={template.isActive}
                    onConfirm={() => onToggleActive(template)}
                  >
                    <Button size="sm" variant={template.isActive ? "ghost" : "default"}>
                      {template.isActive ? "Disable" : "Enable"}
                    </Button>
                  </ConfirmDialog>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
