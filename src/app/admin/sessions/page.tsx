"use client";

import { useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { CalendarRange, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import { EmptyState } from "@/components/common/EmptyState";
import { SessionsTable } from "@/components/admin/SessionsTable";
import { SessionDetail } from "@/components/admin/SessionDetail";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSessions, type SessionRecord } from "@/hooks/useSessions";
import { firestore } from "@/lib/firebaseClient";

const dateRanges = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "All", value: 0 },
] as const;

export default function AdminSessionsPage() {
  const { sessions, loading, error } = useSessions();
  const [selectedRange, setSelectedRange] = useState<number>(30);
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [minRating, setMinRating] = useState(0);
  const [search, setSearch] = useState("");

  const cutoffDate = useMemo(() => {
    if (!selectedRange) return null;
    const date = new Date();
    date.setDate(date.getDate() - selectedRange);
    return date;
  }, [selectedRange]);

  const uniqueProperties = useMemo(() => {
    return Array.from(new Set(sessions.map((session) => session.locationName)));
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      if (cutoffDate && session.startedAt) {
        const started = new Date(session.startedAt);
        if (started < cutoffDate) return false;
      }
      if (propertyFilter !== "all" && session.locationName !== propertyFilter) return false;
      if (outcomeFilter !== "all" && session.outcome !== outcomeFilter) return false;
      if (session.qc.rating < minRating) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        if (!session.taskName.toLowerCase().includes(query) && !session.locationName.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [sessions, cutoffDate, propertyFilter, outcomeFilter, minRating, search]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSession, setDetailSession] = useState<SessionRecord | null>(null);
  const [savingQc, setSavingQc] = useState(false);

  function handleView(session: SessionRecord) {
    setDetailSession(session);
    setDetailOpen(true);
  }

  async function handleSaveQc({ sessionId, rating, notes }: { sessionId: string; rating: number; notes: string }) {
    setSavingQc(true);
    try {
      await updateDoc(doc(firestore, "sessions", sessionId), {
        "qc.rating": rating,
        "qc.notes": notes,
      });
      toast.success("QC updated");
      setDetailOpen(false);
    } catch (error) {
      toast.error("Failed to update QC");
      console.error(error);
    } finally {
      setSavingQc(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-widest text-neutral-400">Admin / Sessions</p>
        <h1 className="text-3xl font-semibold text-neutral-900">Session Review</h1>
        <p className="text-sm text-neutral-500">
          Inspect teleoperation sessions, update QC feedback, and understand operator vs robot time.
        </p>
      </header>

      <Card className="border-neutral-200">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <CalendarRange className="h-4 w-4 text-neutral-400" />
              <span>Filters</span>
            </div>
            <div className="flex gap-2">
              {dateRanges.map((range) => (
                <Button
                  key={range.value}
                  size="sm"
                  variant={selectedRange === range.value ? "default" : "outline"}
                  onClick={() => setSelectedRange(range.value)}
                >
                  {range.label}
                </Button>
              ))}
            </div>
            <select
              value={propertyFilter}
              onChange={(event) => setPropertyFilter(event.target.value)}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All properties</option>
              {uniqueProperties.map((property) => (
                <option key={property} value={property}>
                  {property}
                </option>
              ))}
            </select>
            <select
              value={outcomeFilter}
              onChange={(event) => setOutcomeFilter(event.target.value)}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All outcomes</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="aborted">Aborted</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-neutral-600">
              Min rating
              <Input
                type="number"
                min={0}
                max={5}
                value={minRating}
                onChange={(event) => setMinRating(Number(event.target.value))}
                className="w-16"
              />
            </label>
            <div className="ml-auto flex items-center gap-2">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tasks or properties…"
                className="w-[220px]"
              />
            </div>
          </div>

          {error ? (
            <EmptyState title="Unable to load sessions" description={error} />
          ) : loading ? (
            <div className="flex min-h-[200px] items-center justify-center text-neutral-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filteredSessions.length ? (
            <SessionsTable sessions={filteredSessions} onView={handleView} />
          ) : (
            <EmptyState title="No sessions match the filters" description="Adjust filters or timeframe to see more sessions." />
          )}
        </CardContent>
      </Card>

      <SessionDetail
        session={detailSession}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onSaveQc={handleSaveQc}
        saving={savingQc}
      />
    </div>
  );
}
