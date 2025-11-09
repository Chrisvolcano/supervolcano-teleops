"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { collection, doc, setDoc, updateDoc } from "firebase/firestore";

import { SessionHUD, type Session } from "@/components/SessionHUD";
import { TaskList, type PortalTask } from "@/components/TaskList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useDoc } from "@/hooks/useDoc";
import { useCollection } from "@/hooks/useCollection";
import { firestore } from "@/lib/firebaseClient";
import { TaskState, TASK_TERMINAL_STATES, canTransition } from "@/lib/taskMachine";
import { incrementTemplateCompletion } from "@/lib/templates";

function normalizeStatus(value: unknown): "scheduled" | "unassigned" {
  if (typeof value !== "string") {
    return "unassigned";
  }
  const lower = value.toLowerCase();
  return lower === "scheduled" ? "scheduled" : "unassigned";
}

const statusCopy: Record<"scheduled" | "unassigned", string> = {
  scheduled: "Scheduled",
  unassigned: "Unassigned",
};

type PropertyDoc = {
  id: string;
  name: string;
  partnerOrgId: string;
  address?: string;
  status: "scheduled" | "unassigned";
  description?: string;
  images?: string[];
  activeSessionId?: string | null;
};

type PropertyNote = {
  id: string;
  propertyId: string;
  partnerOrgId: string;
  authorId: string;
  authorEmail: string;
  content: string;
  createdAt: string;
};

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading, claims } = useAuth();
  const role = (claims?.role as string | undefined) ?? "operator";
  const partnerOrgIdClaim = claims?.partner_org_id as string | undefined;
  const isAdmin = role === "admin";

  const propertyId = params?.id;

  const {
    data: property,
    loading: propertyLoading,
    error: propertyError,
  } = useDoc<PropertyDoc>({
    path: "properties",
    docId: propertyId!,
    enabled: Boolean(propertyId),
    parse: (doc) =>
      ({
        id: doc.id,
        name: doc.name ?? "Unnamed property",
        description: doc.description ?? undefined,
        address: doc.address ?? doc.location ?? undefined,
        partnerOrgId: doc.partnerOrgId ?? "unknown",
        status: normalizeStatus(doc.status),
        images: doc.images ?? [],
        activeSessionId: doc.activeSessionId ?? null,
      }) as PropertyDoc,
  });

  const {
    data: tasks,
    loading: tasksLoading,
    error: tasksError,
  } = useCollection<PortalTask>({
    path: "tasks",
    enabled: Boolean(propertyId),
    whereEqual: [
      { field: "propertyId", value: propertyId },
      ...(!isAdmin
        ? [{ field: "assigned_to", value: "teleoperator" }]
        : []),
      ...(partnerOrgIdClaim && !isAdmin
        ? [{ field: "partnerOrgId", value: partnerOrgIdClaim }]
        : []),
    ],
    orderByField: { field: "updatedAt", direction: "desc" },
    parse: (doc) =>
      ({
        id: doc.id,
        name: doc.name ?? doc.title ?? "Untitled task",
        propertyId: doc.propertyId,
        status: doc.status ?? doc.state ?? "scheduled",
        assignment: doc.assigned_to ?? "teleoperator",
        duration: doc.duration ?? undefined,
        priority: doc.priority ?? undefined,
        assignedToUserId: doc.assignedToUserId ?? doc.assigneeId ?? null,
        updatedAt: doc.updatedAt ?? undefined,
      }) as PortalTask,
  });

  const {
    data: notes,
    loading: notesLoading,
    error: notesError,
  } = useCollection<PropertyNote>({
    path: "propertyNotes",
    enabled: Boolean(propertyId),
    whereEqual: [{ field: "propertyId", value: propertyId }],
    orderByField: { field: "createdAt", direction: "desc" },
    parse: (doc) =>
      ({
        id: doc.id,
        propertyId: doc.propertyId,
        partnerOrgId: doc.partnerOrgId,
        authorId: doc.authorId,
        authorEmail: doc.authorEmail,
        content: doc.content,
        createdAt: doc.createdAt,
      }) as PropertyNote,
  });

  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const {
    data: activeSession,
    error: sessionError,
  } = useDoc<Session>({
    path: "sessions",
    docId: property?.activeSessionId ?? "",
    enabled: Boolean(property?.activeSessionId),
    parse: (doc) =>
      ({
        id: doc.id,
        operatorId: doc.operatorId,
        partnerOrgId: doc.partnerOrgId,
        taskId: doc.taskId ?? null,
        allowedHours: doc.allowedHours ?? 0,
        startedAt: doc.startedAt,
        endedAt: doc.endedAt ?? null,
        status: doc.status ?? "pending",
      }) as Session,
  });

  const taskHistory = useMemo(() => {
    return tasks
      .map((task) => ({
        id: task.id,
        name: task.name,
        status: task.status,
        updatedAt: task.updatedAt ?? new Date().toISOString(),
        propertyId: task.propertyId,
      }))
      .slice(0, 10);
  }, [tasks]);

  async function updateTaskStatus(task: PortalTask, next: TaskState) {
    if (TASK_TERMINAL_STATES.includes(task.status)) {
      return;
    }

    const allowedDirectTransition =
      (task.status === "available" && next === "in_progress") ||
      (task.status === "in_progress" && next === "completed");

    if (!allowedDirectTransition && !canTransition(task.status, next)) {
      return;
    }

    const taskRef = doc(firestore, "tasks", task.id);
    await updateDoc(taskRef, {
      status: next,
      state: next,
      updatedAt: new Date().toISOString(),
      assignedToUserId: user?.uid ?? null,
    });
    if (next === "completed") {
      await incrementTemplateCompletion(task.templateId, task.assignment);
    }
  }

  async function saveNote() {
    if (!user || !property || !noteDraft.trim()) {
      return;
    }

    setSavingNote(true);
    try {
      const noteRef = doc(firestore, "propertyNotes");
      await setDoc(noteRef, {
        propertyId: property.id,
        partnerOrgId: property.partnerOrgId,
        authorId: user.uid,
        authorEmail: user.email ?? "unknown",
        content: noteDraft.trim(),
        createdAt: new Date().toISOString(),
      });
      setNoteDraft("");
    } finally {
      setSavingNote(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-neutral-500">Loading property…</p>
      </div>
    );
  }

  if (!user) {
    router.replace("/login");
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/properties")} className="text-sm text-neutral-500">
          ← Back to properties
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/task/${tasks[0]?.id ?? ""}`} prefetch>
            View latest task
          </Link>
        </Button>
      </div>

      {propertyLoading ? (
        <div className="space-y-3">
          <div className="h-10 w-2/3 animate-pulse rounded-lg bg-neutral-100" />
          <div className="h-5 w-1/2 animate-pulse rounded-lg bg-neutral-100" />
          <div className="h-48 animate-pulse rounded-2xl bg-neutral-100" />
        </div>
      ) : property ? (
        <section className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">{property.name}</h1>
              <p className="text-sm text-neutral-500">Partner org: {property.partnerOrgId}</p>
              {property.address ? (
                <p className="mt-1 text-sm text-neutral-500">{property.address}</p>
              ) : null}
            </div>
            <Badge variant={property.status === "scheduled" ? "default" : "secondary"}>
              {statusCopy[property.status]}
            </Badge>
          </div>

          {property.images && property.images.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {property.images.map((imageUrl) => (
                <div key={imageUrl} className="relative h-48 w-full overflow-hidden rounded-xl border border-neutral-200">
                  <Image src={imageUrl} alt={`${property.name} image`} fill className="object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-sm text-neutral-500">
              No media uploaded for this property yet.
            </div>
          )}

          {property.description ? (
            <p className="text-sm leading-relaxed text-neutral-600">{property.description}</p>
          ) : (
            <p className="text-sm text-neutral-500">No overview provided. Reach out to your admin if you need details.</p>
          )}
        </section>
      ) : propertyError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{propertyError}</p>
      ) : null}

      {sessionError ? (
        <p className="text-sm text-red-600">{String(sessionError)}</p>
      ) : null}
      <SessionHUD session={property?.activeSessionId ? activeSession ?? null : null} />

      <section className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <Card className="border-neutral-200">
          <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-lg">Active tasks</CardTitle>
            <p className="text-xs text-neutral-500">
              Tasks assigned to teleoperators. Start or complete them as you work.
            </p>
          </CardHeader>
          <CardContent>
            {tasksError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {tasksError}
              </p>
            ) : tasksLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-16 animate-pulse rounded-md bg-neutral-100" />
                ))}
              </div>
            ) : (
              <TaskList
                tasks={tasks}
                showActions={!isAdmin}
                onStartTask={(task) => updateTaskStatus(task, "in_progress")}
                onCompleteTask={(task) => updateTaskStatus(task, "completed")}
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle className="text-lg">Task history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {taskHistory.length ? (
              taskHistory.map((item) => (
                <div key={item.id} className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>{new Date(item.updatedAt).toLocaleString()}</span>
                    <Link href={`/task/${item.id}`} className="text-neutral-900 transition hover:underline">
                      View task
                    </Link>
                  </div>
                  <p className="font-medium text-neutral-800">{item.name}</p>
                  <p>Status: {item.status}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-neutral-500">No task updates recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle className="text-lg">Property notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="Document observations, hand-off notes, or reminders for the next teleoperator."
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                rows={4}
              />
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>Notes are visible to teammates for this property.</span>
                <Button size="sm" onClick={saveNote} disabled={savingNote || !noteDraft.trim()}>
                  {savingNote ? "Saving…" : "Save note"}
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {notesError ? (
                <p className="text-sm text-red-600">{notesError}</p>
              ) : notesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-md bg-neutral-100" />
                  ))}
                </div>
              ) : notes.length ? (
                notes.map((note) => (
                  <div key={note.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span>{new Date(note.createdAt).toLocaleString()}</span>
                      <span>{note.authorEmail}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-neutral-500">No notes yet. Leave the first update above.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle className="text-lg">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-neutral-600">
            <Button asChild variant="outline" className="w-full">
              <Link href={`/task/${tasks.find((task) => task.status !== "completed")?.id ?? ""}`}>
                Resume latest task
              </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link href="mailto:tony@supervolcano.ai?subject=Support%20request%20for%20property">
                Contact support
              </Link>
            </Button>
            <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-xs leading-relaxed text-neutral-500">
              Keep this property up to date by documenting progress, uploading imagery, and marking tasks complete once finished.
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

