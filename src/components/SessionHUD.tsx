"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SessionStatus = "pending" | "active" | "ended";

export type Session = {
  id: string;
  operatorId: string;
  partnerOrgId: string;
  taskId?: string | null;
  startedAt: string;
  endedAt?: string | null;
  allowedHours: number;
  status: SessionStatus;
};

type SessionHUDProps = {
  session?: Session | null;
  className?: string;
  onStop?: (sessionId: string) => Promise<void> | void;
};

export function SessionHUD({ session, className, onStop }: SessionHUDProps) {
  const { elapsedHours, remainingHours } = useMemo(() => {
    if (!session) {
      return { elapsedHours: 0, remainingHours: 0 };
    }
    const start = new Date(session.startedAt).getTime();
    const end = session.endedAt
      ? new Date(session.endedAt).getTime()
      : Date.now();
    const elapsedMs = Math.max(end - start, 0);
    const elapsed = elapsedMs / (1000 * 60 * 60);
    const remaining = Math.max(session.allowedHours - elapsed, 0);
    return {
      elapsedHours: Number(elapsed.toFixed(2)),
      remainingHours: Number(remaining.toFixed(2)),
    };
  }, [session]);

  if (!session) {
    return (
      <Card className={cn("border-dashed bg-muted/10", className)}>
        <CardHeader>
          <CardTitle>Session HUD</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No active session. Start a new session from the control panel.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Session HUD</CardTitle>
          <Badge variant={session.status === "active" ? "default" : "secondary"}>
            {session.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          Operator: <span className="font-medium">{session.operatorId}</span>
        </p>
        <p>
          Partner org:{" "}
          <span className="font-medium">{session.partnerOrgId}</span>
        </p>
        {session.taskId && (
          <p>
            Task: <span className="font-medium">{session.taskId}</span>
          </p>
        )}
        <div className="grid gap-1 md:grid-cols-2">
          <p>Elapsed: {elapsedHours} hrs</p>
          <p>Remaining: {remainingHours} hrs</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Started {new Date(session.startedAt).toLocaleString()}
        </p>
        {session.endedAt && (
          <p className="text-xs text-muted-foreground">
            Ended {new Date(session.endedAt).toLocaleString()}
          </p>
        )}
        {onStop && session.status === "active" && (
          <Button
            variant="destructive"
            onClick={() => onStop(session.id)}
            className="mt-2 w-full"
          >
            Stop Session
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

