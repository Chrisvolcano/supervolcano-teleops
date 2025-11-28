"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SessionRecord } from "@/hooks/useSessions";
import { computeRoleSplit } from "@/lib/metrics";
import { formatDateTime, formatDuration } from "@/lib/format";

function renderRating(rating: number) {
  return "★★★★★".split("").map((star, index) => (
    <span key={index} className={index < rating ? "text-amber-500" : "text-neutral-300"}>
      {star}
    </span>
  ));
}

type SessionsTableProps = {
  sessions: SessionRecord[];
  onView: (session: SessionRecord) => void;
};

export function SessionsTable({ sessions, onView }: SessionsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Property</TableHead>
          <TableHead>Task</TableHead>
          <TableHead>Outcome</TableHead>
          <TableHead>QC</TableHead>
          <TableHead>Robot vs Human</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead className="text-right">View</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((session) => {
          const split = computeRoleSplit(session.metrics);
          const startedAt = session.startedAt ? new Date(session.startedAt).getTime() : undefined;
          const endedAt = session.endedAt ? new Date(session.endedAt).getTime() : undefined;
          const durationSec = startedAt && endedAt ? Math.max(0, Math.round((endedAt - startedAt) / 1000)) : 0;

          return (
            <TableRow key={session.id}>
              <TableCell className="text-sm text-neutral-700">{formatDateTime(session.startedAt)}</TableCell>
              <TableCell className="text-sm text-neutral-700">{session.locationName}</TableCell>
              <TableCell className="text-sm text-neutral-700">{session.taskName}</TableCell>
              <TableCell className="text-sm capitalize text-neutral-700">{session.outcome}</TableCell>
              <TableCell className="text-sm">
                <span className="flex items-center gap-1 text-xs">{renderRating(session.qc.rating)}</span>
              </TableCell>
              <TableCell className="text-sm text-neutral-700">
                {split.robotPercent}% robot / {split.humanPercent}% human
              </TableCell>
              <TableCell className="text-sm text-neutral-700">{formatDuration(durationSec)}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline" onClick={() => onView(session)}>
                  View
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
