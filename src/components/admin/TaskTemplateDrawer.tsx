"use client";

import { Loader2 } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TaskTemplate } from "@/hooks/useTaskTemplates";
import type { TemplateUsageRow } from "@/hooks/useTemplateUsage";

import { EmptyState } from "@/components/common/EmptyState";

type TaskTemplateDrawerProps = {
  template: TaskTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  usage: TemplateUsageRow[];
};

export function TaskTemplateDrawer({ template, open, onOpenChange, loading, usage }: TaskTemplateDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-xl border-l border-neutral-200">
        <div className="flex h-full flex-col pt-16">
          <div className="flex-1 overflow-y-auto px-6">
            <SheetHeader className="space-y-2">
              <SheetTitle>{template ? template.name : "Template"}</SheetTitle>
              {template ? (
                <p className="text-sm text-neutral-500">
                  Difficulty: {template.difficulty.toUpperCase()} • Default assignment: {template.defaultAssignedTo}
                </p>
              ) : null}
            </SheetHeader>

            <div className="mt-6 space-y-4">
              {loading ? (
                <div className="flex min-h-[200px] items-center justify-center text-neutral-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : usage.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead className="text-center">Open tasks</TableHead>
                      <TableHead className="text-center">Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usage.map((row) => (
                      <TableRow key={row.locationId}>
                        <TableCell>
                          <span className="font-medium text-neutral-900">{row.locationName}</span>
                        </TableCell>
                        <TableCell className="text-center text-sm">{row.openCount}</TableCell>
                        <TableCell className="text-center text-sm">{row.completedCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState title="No usage yet" description="This template is not assigned to any properties." />
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
