"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes, deleteObject } from "firebase/storage";

import { TaskForm, type TaskFormData } from "@/components/TaskForm";
import type { Property, PropertyStatus } from "@/components/PropertyCard";
import type { PortalTask } from "@/components/TaskList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useCollection";
import { firestore, storage } from "@/lib/firebaseClient";
import { cn } from "@/lib/utils";

const PROPERTY_STATUS_OPTIONS: PropertyStatus[] = [
  "scheduled",
  "unassigned",
];

function normalizeStatus(value: unknown): PropertyStatus {
  if (typeof value !== "string") {
    return "unassigned";
  }
  const lower = value.toLowerCase();
  return lower === "scheduled" ? "scheduled" : "unassigned";
}

function buildEmptyForm(partnerOrgId?: string): PropertyFormState {
  return {
    name: "",
    address: "",
    partnerOrgId: partnerOrgId ?? "demo-org",
    status: "unassigned",
    description: "",
    existingImages: [],
    removedImages: [],
    uploadFiles: [],
  };
}

type AdminProperty = Property & {
  description?: string;
  partnerOrgId: string;
  status?: PropertyStatus;
  images: string[];
  taskCount: number;
  createdBy?: string | null;
};

type PropertyFormState = {
  name: string;
  address: string;
  partnerOrgId: string;
  status: PropertyStatus;
  description: string;
  existingImages: string[];
  removedImages: string[];
  uploadFiles: File[];
};

const EMPTY_FORM: PropertyFormState = {
  name: "",
  address: "",
  partnerOrgId: "demo-org",
  status: "unassigned",
  description: "",
  existingImages: [],
  removedImages: [],
  uploadFiles: [],
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, claims, loading: authLoading } = useAuth();

  const role = (claims?.role as string | undefined) ?? "operator";
  const partnerOrgClaim =
    typeof claims?.partner_org_id === "string" ? (claims.partner_org_id as string) : undefined;
  const isAdmin = role === "admin";

  const {
    data: properties,
    loading: propertiesLoading,
    error: propertiesError,
  } = useCollection<AdminProperty>({
    path: "properties",
    enabled: isAdmin,
    parse: (doc) =>
      ({
        id: doc.id,
        name: doc.name ?? "Untitled property",
        partnerOrgId: doc.partnerOrgId ?? "demo-org",
        address: doc.address ?? doc.location ?? "",
        status: normalizeStatus(doc.status),
        images: doc.images ?? [],
        taskCount: doc.taskCount ?? doc.activeTasks ?? 0,
        description: doc.description ?? "",
        createdBy: doc.createdBy ?? null,
      }) as AdminProperty,
  });

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [propertyModalOpen, setPropertyModalOpen] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [propertyFormState, setPropertyFormState] = useState<PropertyFormState>(() =>
    buildEmptyForm(partnerOrgClaim),
  );
  const [propertySaving, setPropertySaving] = useState(false);
  const [propertyFormError, setPropertyFormError] = useState<string | null>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskFormLoading, setTaskFormLoading] = useState(false);
  const [editingTask, setEditingTask] = useState<PortalTask | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!taskFormOpen) {
      setEditingTask(null);
    }
  }, [taskFormOpen]);

  useEffect(() => {
    if (!selectedPropertyId && properties.length) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  useEffect(() => {
    if (!propertyModalOpen && !editingPropertyId) {
      setPropertyFormState(buildEmptyForm(partnerOrgClaim));
      setPropertyFormError(null);
    }
  }, [propertyModalOpen, editingPropertyId, partnerOrgClaim]);

  const selectedProperty = properties.find((item) => item.id === selectedPropertyId) ?? null;
  const editingProperty = editingPropertyId
    ? properties.find((item) => item.id === editingPropertyId) ?? null
    : null;
  const isEditingProperty = Boolean(editingPropertyId);

  const {
    data: tasks,
    loading: tasksLoading,
    error: tasksError,
  } = useCollection<PortalTask>({
    path: "tasks",
    enabled: Boolean(selectedPropertyId),
    whereEqual: selectedPropertyId
      ? [{ field: "propertyId", value: selectedPropertyId }]
      : undefined,
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

  const operatorTaskCount = useMemo(() => {
    return tasks.filter((task) => task.assignment === "teleoperator").length;
  }, [tasks]);

  const taskFormInitialValues = useMemo(() => {
    if (!editingTask) {
      return undefined;
    }

    return {
      name: editingTask.name,
      type: "general",
      duration: editingTask.duration,
      priority: editingTask.priority,
      assignment: editingTask.assignment,
      status: editingTask.status,
    } satisfies Partial<TaskFormData>;
  }, [editingTask]);

  function openCreatePropertyModal() {
    setEditingPropertyId(null);
    setPropertyFormState(buildEmptyForm(partnerOrgClaim));
    setPropertyFormError(null);
    setPropertyModalOpen(true);
  }

  function openEditPropertyModal(property: AdminProperty) {
    setEditingPropertyId(property.id);
    setPropertyFormError(null);
    setPropertyFormState({
      name: property.name,
      address: property.address ?? "",
      partnerOrgId: property.partnerOrgId,
      status: normalizeStatus(property.status),
      description: property.description ?? "",
      existingImages: property.images ?? [],
      removedImages: [],
      uploadFiles: [],
    });
    setSelectedPropertyId(property.id);
    setPropertyModalOpen(true);
  }

  function handlePropertyFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files) return;
    setPropertyFormState((prev) => ({
      ...prev,
      uploadFiles: [...prev.uploadFiles, ...Array.from(files)],
    }));
  }

  function removePendingUpload(index: number) {
    setPropertyFormState((prev) => ({
      ...prev,
      uploadFiles: prev.uploadFiles.filter((_, fileIndex) => fileIndex !== index),
    }));
  }

  function toggleRemoveImage(url: string) {
    setPropertyFormState((prev) => {
      const alreadyRemoved = prev.removedImages.includes(url);
      return {
        ...prev,
        removedImages: alreadyRemoved
          ? prev.removedImages.filter((item) => item !== url)
          : [...prev.removedImages, url],
      };
    });
  }

  async function persistProperty() {
    if (!user) return;

    const basePartnerOrgId = propertyFormState.partnerOrgId.trim() || partnerOrgClaim || "demo-org";
    const propertyRef = editingPropertyId
      ? doc(firestore, "properties", editingPropertyId)
      : doc(collection(firestore, "properties"));
    const docId = propertyRef.id;

    setPropertySaving(true);
    setPropertyFormError(null);
    try {
      await user.getIdToken?.(true);

      if (propertyFormState.removedImages.length) {
        await Promise.all(
          propertyFormState.removedImages.map(async (url) => {
            try {
              const parsed = new URL(url);
              const storageRef = ref(storage, decodeURIComponent(parsed.pathname.replace(/^\//, "")));
              await deleteObject(storageRef);
            } catch (error) {
              console.warn("Failed to remove image", url, error);
            }
          }),
        );
      }

      const uploadedImageUrls: string[] = [];
      for (const file of propertyFormState.uploadFiles) {
        const path = `properties/${docId}/${crypto.randomUUID()}-${file.name}`;
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        uploadedImageUrls.push(url);
      }

      const images = propertyFormState.existingImages
        .filter((url) => !propertyFormState.removedImages.includes(url))
        .concat(uploadedImageUrls);

      const payload = {
        name: propertyFormState.name.trim(),
        address: propertyFormState.address.trim(),
        partnerOrgId: basePartnerOrgId,
        status: propertyFormState.status,
        description: propertyFormState.description.trim(),
        images,
        taskCount: editingProperty?.taskCount ?? 0,
        updatedAt: new Date().toISOString(),
        ...(editingProperty
          ? {}
          : {
              createdAt: new Date().toISOString(),
              createdBy: user.uid,
            }),
      };

      await setDoc(propertyRef, payload, { merge: Boolean(editingProperty) });

      console.info("[admin] property saved", docId);
      setSelectedPropertyId(docId);
      setPropertyModalOpen(false);
      setTimeout(() => setPropertyModalOpen(false), 0);
      setEditingPropertyId(null);
      setPropertyFormState(buildEmptyForm(partnerOrgClaim));
    } catch (error) {
      console.error("[admin] failed to save property", error);
      const message =
        error instanceof Error ? error.message : "Unable to save property. Verify your admin access.";
      setPropertyFormError(message);
    } finally {
      setPropertySaving(false);
    }
  }

  async function handleDeleteProperty(property: AdminProperty) {
    if (!confirm(`Delete property "${property.name}"? This will remove all tasks.`)) {
      return;
    }

    const propertyRef = doc(firestore, "properties", property.id);
    const tasksQuery = query(
      collection(firestore, "tasks"),
      where("propertyId", "==", property.id),
    );
    const snapshots = await getDocs(tasksQuery);
    const batchDelete = snapshots.docs.map((snapshot) =>
      deleteDoc(doc(firestore, "tasks", snapshot.id)),
    );

    await Promise.all(batchDelete);
    await deleteDoc(propertyRef);

    if (selectedPropertyId === property.id) {
      setSelectedPropertyId(null);
    }
  }

  async function handleTogglePropertyStatus(property: AdminProperty, checked: boolean) {
    const nextStatus: PropertyStatus = checked ? "scheduled" : "unassigned";
    await updateDoc(doc(firestore, "properties", property.id), {
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    });
  }

  function openCreateTask() {
    setEditingTask(null);
    setTaskFormOpen(true);
  }

  function openEditTask(task: PortalTask) {
    setEditingTask(task);
    setTaskFormOpen(true);
  }

  async function saveTask(form: TaskFormData) {
    if (!selectedProperty) return;

    setTaskFormLoading(true);
    try {
      if (editingTask) {
        const taskRef = doc(firestore, "tasks", editingTask.id);
        await updateDoc(taskRef, {
          name: form.name,
          type: form.type ?? "general",
          duration: form.duration ?? null,
          priority: form.priority ?? null,
          assigned_to: form.assignment,
          assignment: form.assignment,
          status: form.status,
          state: form.status,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const taskRef = doc(collection(firestore, "tasks"));
        await setDoc(taskRef, {
          name: form.name,
          type: form.type ?? "general",
          duration: form.duration ?? null,
          priority: form.priority ?? null,
          assigned_to: form.assignment,
          assignment: form.assignment,
          status: form.status,
          state: form.status,
          propertyId: selectedProperty.id,
          partnerOrgId: selectedProperty.partnerOrgId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          assignedToUserId: null,
        });
        await updateDoc(doc(firestore, "properties", selectedProperty.id), {
          taskCount: increment(1),
        });
      }
    } finally {
      setTaskFormLoading(false);
      setTaskFormOpen(false);
    }
  }

  async function deleteTask(task: PortalTask) {
    if (!selectedProperty) return;
    if (!confirm(`Delete task "${task.name}"?`)) return;

    setDeletingTaskId(task.id);
    try {
      await deleteDoc(doc(firestore, "tasks", task.id));
      await updateDoc(doc(firestore, "properties", selectedProperty.id), {
        taskCount: increment(-1),
      });
    } finally {
      setDeletingTaskId(null);
    }
  }

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading account…</p>
      </main>
    );
  }

  if (!user || !isAdmin) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Card className="w-full max-w-md border-neutral-200">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Admin access required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>You do not have permission to view this dashboard.</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/properties">Return to properties</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage properties, assets, and teleoperator tasks.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.push("/properties")}>View operator portal</Button>
          <Button onClick={openCreatePropertyModal}>Add property</Button>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-[2fr_3fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Properties</h2>
            <span className="text-xs uppercase tracking-wide text-neutral-500">
              {properties.length} total
            </span>
          </div>
          {propertiesError && (
            <p className="text-sm text-destructive">{propertiesError}</p>
          )}
          <div className="space-y-4">
            {propertiesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-52 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : properties.length ? (
              properties.map((property) => (
                <article
                  key={property.id}
                  className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-neutral-900">{property.name}</h3>
                      {property.address ? (
                        <p className="text-sm text-neutral-500">{property.address}</p>
                      ) : (
                        <p className="text-sm text-neutral-400">No address provided</p>
                      )}
                      <p className="text-xs uppercase tracking-wide text-neutral-400">
                        Partner org: <span className="font-medium text-neutral-600">{property.partnerOrgId}</span>
                      </p>
                      <p className="text-xs uppercase tracking-wide text-neutral-400">
                        Tasks: <span className="font-medium text-neutral-600">{property.taskCount}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={property.status === "scheduled" ? "default" : "secondary"}>
                        {property.status === "scheduled" ? "Scheduled" : "Unassigned"}
                      </Badge>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span>Scheduled</span>
                        <Switch
                          checked={property.status === "scheduled"}
                          onCheckedChange={(checked) => handleTogglePropertyStatus(property, checked)}
                          aria-label="Toggle scheduled status"
                        />
                      </div>
                    </div>
                  </div>

                  {property.images.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {property.images.slice(0, 3).map((url) => (
                        <div
                          key={url}
                          className="relative h-20 w-28 overflow-hidden rounded-lg border border-neutral-200"
                        >
                          <Image src={url} alt={`${property.name} thumbnail`} fill className="object-cover" />
                        </div>
                      ))}
                      {property.images.length > 3 && (
                        <div className="flex h-20 w-24 items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 text-xs font-medium text-neutral-500">
                          +{property.images.length - 3}
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={selectedPropertyId === property.id ? "default" : "outline"}
                      onClick={() => setSelectedPropertyId(property.id)}
                    >
                      {selectedPropertyId === property.id ? "Viewing" : "View overview"}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => openEditPropertyModal(property)}>
                      Edit details
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/property/${property.id}`}>Open property page</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteProperty(property)}
                    >
                      Delete property
                    </Button>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No properties yet. Create one to get started.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-neutral-200">
            <CardHeader className="flex flex-col gap-1">
              <CardTitle>Property overview</CardTitle>
              {selectedProperty ? (
                <p className="text-sm text-muted-foreground">
                  {selectedProperty.name} • {selectedProperty.partnerOrgId}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a property to view tasks and assets.
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedProperty ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border bg-white p-4">
                      <p className="text-xs uppercase text-neutral-500">Teleoperator tasks</p>
                      <p className="text-2xl font-semibold">{operatorTaskCount}</p>
                    </div>
                    <div className="rounded-lg border bg-white p-4">
                      <p className="text-xs uppercase text-neutral-500">Total tasks</p>
                      <p className="text-2xl font-semibold">{tasks.length}</p>
                    </div>
                  </div>
                  {selectedProperty.images.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedProperty.images.map((url) => (
                        <div key={url} className="relative h-36 w-full overflow-hidden rounded-lg">
                          <Image src={url} alt={selectedProperty.name} fill className="object-cover" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No images uploaded yet.
                    </div>
                  )}
                  <Button onClick={openCreateTask} className="w-full">
                    Add task
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Choose a property to manage assigned tasks.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-neutral-200">
            <CardHeader className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <CardTitle>Tasks</CardTitle>
                <Button size="sm" onClick={openCreateTask} disabled={!selectedProperty}>
                  Add task
                </Button>
              </div>
              {tasksError && (
                <p className="text-xs text-destructive">{tasksError}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {tasksLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-md bg-muted" />
                  ))}
                </div>
              ) : tasks.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.name}</TableCell>
                        <TableCell>
                          <Badge variant={task.assignment === "teleoperator" ? "default" : "secondary"}>
                            {task.assignment === "teleoperator" ? "Teleoperator" : "Human"}
                          </Badge>
                        </TableCell>
                        <TableCell>{task.status}</TableCell>
                        <TableCell>{task.duration ? `${task.duration} min` : "—"}</TableCell>
                        <TableCell>{task.priority ?? "—"}</TableCell>
                        <TableCell className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditTask(task)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteTask(task)}
                            disabled={deletingTaskId === task.id}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No tasks for this property yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <Dialog open={propertyModalOpen} onOpenChange={setPropertyModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{isEditingProperty ? "Edit property" : "Create property"}</DialogTitle>
            <DialogDescription>
              {isEditingProperty
                ? "Update property details, address, and images."
                : "Define a new property for teleoperator assignments."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {propertyFormError && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {propertyFormError}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="property-name">Name</Label>
                <Input
                  id="property-name"
                  value={propertyFormState.name}
                  onChange={(event) =>
                    setPropertyFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="property-partner">Partner org</Label>
                <Input
                  id="property-partner"
                  value={propertyFormState.partnerOrgId}
                  onChange={(event) =>
                    setPropertyFormState((prev) => ({
                      ...prev,
                      partnerOrgId: event.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="property-address">Address</Label>
              <Input
                id="property-address"
                value={propertyFormState.address}
                onChange={(event) =>
                  setPropertyFormState((prev) => ({
                    ...prev,
                    address: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="property-status">Status</Label>
              <select
                id="property-status"
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                value={propertyFormState.status}
                onChange={(e) =>
                  setPropertyFormState((prev) => ({
                    ...prev,
                    status: e.target.value as PropertyStatus,
                  }))
                }
              >
                {PROPERTY_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="property-description">Description</Label>
              <textarea
                id="property-description"
                className="min-h-[96px] w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                value={propertyFormState.description}
                onChange={(event) =>
                  setPropertyFormState((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="property-images">Images</Label>
              <Input
                id="property-images"
                type="file"
                multiple
                accept="image/*"
                onChange={handlePropertyFileChange}
              />
              {propertyFormState.existingImages.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {propertyFormState.existingImages.map((url) => {
                    const markedForRemoval = propertyFormState.removedImages.includes(url);
                    return (
                      <div key={url} className="relative h-36 w-full overflow-hidden rounded-lg">
                        <Image
                          src={url}
                          alt="Property image"
                          fill
                          className={cn("object-cover", markedForRemoval && "opacity-50 grayscale")}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant={markedForRemoval ? "default" : "outline"}
                          onClick={() => toggleRemoveImage(url)}
                          className="absolute right-2 top-2 h-8 w-8 rounded-full"
                        >
                          <span className="sr-only">
                            {markedForRemoval ? "Undo remove image" : "Remove image"}
                          </span>
                          {markedForRemoval ? "↩" : "✕"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              {propertyFormState.uploadFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-neutral-700">Pending uploads</p>
                  <ul className="space-y-2">
                    {propertyFormState.uploadFiles.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm"
                      >
                        <span className="truncate pr-3 text-neutral-600">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePendingUpload(index)}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={persistProperty} disabled={propertySaving}>
              {propertySaving ? "Saving…" : isEditingProperty ? "Save changes" : "Create property"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedProperty && (
        <TaskForm
          open={taskFormOpen}
          onOpenChange={setTaskFormOpen}
          onSubmit={saveTask}
          loading={taskFormLoading}
          title={editingTask ? `Edit task: ${editingTask.name}` : "Add new task"}
          description={
            editingTask
              ? `Editing task for ${selectedProperty.name}.`
              : `Adding new task for ${selectedProperty.name}.`
          }
          initialValues={taskFormInitialValues}
        />
      )}
    </main>
  );
}
