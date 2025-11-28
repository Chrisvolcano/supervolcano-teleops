"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, index) => (
            <TableRow key={index}>
              <TableCell>
                <div className="space-y-2">
                  <div className="h-4 w-48 bg-neutral-200 rounded animate-pulse" />
                  <div className="h-3 w-32 bg-neutral-100 rounded animate-pulse" />
                </div>
              </TableCell>
              <TableCell>
                <div className="h-6 w-24 bg-neutral-200 rounded-full animate-pulse" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-40 bg-neutral-200 rounded animate-pulse" />
              </TableCell>
              <TableCell>
                <div className="h-5 w-20 bg-neutral-200 rounded-full animate-pulse" />
              </TableCell>
              <TableCell className="text-right">
                <div className="h-8 w-16 bg-neutral-200 rounded animate-pulse ml-auto" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

