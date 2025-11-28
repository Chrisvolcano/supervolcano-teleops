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
import { Textarea } from "@/components/ui/textarea";
import type { SessionRecord } from "@/hooks/useSessions";
import { computeRoleSplit } from "@/lib/metrics";
import { formatDateTime, formatDuration } from "@/lib/format";

function StarInput({ value, onChange }: { value: number; onChange: (rating: number) => void }) {
  return (
    <div className="flex items-center gap-1 text-lg">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          className={rating <= value ? "text-amber-500" : "text-neutral-300"}
          onClick={() => onChange(rating)}
          aria-label={`Set rating ${rating}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

type SessionDetailProps = {
  session: SessionRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveQc: (payload: { sessionId: string; rating: number; notes: string }) => Promise<void> | void;
  saving?: boolean;
};

export function SessionDetail({ session, open, onOpenChange, onSaveQc, saving }: SessionDetailProps) {
  const [rating, setRating] = useState(session?.qc.rating ?? 0);
  const [notes, setNotes] = useState(session?.qc.notes ?? "");

  useEffect(() => {
    setRating(session?.qc.rating ?? 0);
    setNotes(session?.qc.notes ?? "");
  }, [session, open]);

  const split = useMemo(() => computeRoleSplit(session?.metrics), [session]);

  const durationSeconds = useMemo(() => {
    if (!session?.startedAt || !session.endedAt) return 0;
    const start = new Date(session.startedAt).getTime();
    const end = new Date(session.endedAt).getTime();
    return Math.max(0, Math.round((end - start) / 1000));
  }, [session]);

  const donutStyle = {
    background: `conic-gradient(#0f172a ${split.robotPercent * 3.6}deg, #94a3b8 0)` as const,
  };

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    await onSaveQc({ sessionId: session.id, rating, notes });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Session review</DialogTitle>
          <DialogDescription>
            QC outcome and time split for {session?.locationName ?? "a location"} • {session?.taskName ?? "Task"}
          </DialogDescription>
        </DialogHeader>
        {session ? (
          <form className="space-y-6" onSubmit={handleSave}>
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
                <p className="text-xs uppercase text-neutral-500">Outcome</p>
                <p className="mt-1 text-base font-semibold capitalize text-neutral-900">{session.outcome}</p>
                {session.stopCode ? (
                  <p className="text-xs text-neutral-500">Stop code: {session.stopCode}</p>
                ) : null}
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
                <p className="text-xs uppercase text-neutral-500">Duration</p>
                <p className="mt-1 text-base font-semibold text-neutral-900">{formatDuration(durationSeconds)}</p>
                <p className="text-xs text-neutral-500">
                  {formatDateTime(session.startedAt)} → {formatDateTime(session.endedAt)}
                </p>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={donutStyle}
                >
                  <span className="rounded-full bg-white px-3 py-2 text-xs text-neutral-700">
                    {split.robotPercent}% / {split.humanPercent}%
                  </span>
                </div>
                <p className="text-xs text-neutral-500">Robot vs Human time</p>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">QC rating</h3>
                  <p className="text-xs text-neutral-500">Capture quality feedback for this session.</p>
                </div>
                <StarInput value={rating} onChange={setRating} />
              </div>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="QC notes"
                rows={4}
              />
            </section>

            <section className="space-y-2 text-sm text-neutral-600">
              <h3 className="text-sm font-semibold text-neutral-900">Timeline</h3>
              <ul className="space-y-1 text-xs text-neutral-500">
                <li>Session started: {formatDateTime(session.startedAt)}</li>
                {session.teleopUserId ? <li>Teleoperator: {session.teleopUserId}</li> : null}
                {session.humanUserId ? <li>On-site support: {session.humanUserId}</li> : null}
                <li>Session ended: {formatDateTime(session.endedAt)}</li>
              </ul>
            </section>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save QC"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
