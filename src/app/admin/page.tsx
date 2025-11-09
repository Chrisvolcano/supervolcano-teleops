"use client";

import { useCallback, useMemo, useState } from "react";
import { useEffect } from "react";
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
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  ArrowLeft,
  Edit3,
  ExternalLink,
  FilePlus2,
  Layers,
  MapPin,
  Plus,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";

import { TaskForm, type TaskFormData } from "@/components/TaskForm";
import type { PortalTask } from "@/components/TaskList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useCollection";
import { firestore, storage } from "@/lib/firebaseClient";
import { cn } from "@/lib/utils";

const DETAIL_TABS = ["summary", "media", "tasks"] as const;
const FORM_STEPS = ["Basics", "Details", "Media"] as const;

type DetailTab = (typeof DETAIL_TABS)[number];
type FormStep = (typeof FORM_STEPS)[number];

type PropertyStatus = "scheduled" | "unassigned";

type AdminProperty = {
  id: string;
  name: string;
  partnerOrgId: string;
  address?: string;
  status: PropertyStatus;
  description?: string;
  images: string[];
  taskCount: number;
  createdBy?: string | null;
  updatedAt?: string;
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

function normalizeStatus(value: unknown): PropertyStatus {
  if (typeof value !== "string") return "unassigned";
  return value.toLowerCase() === "scheduled" ? "scheduled" : "unassigned";
}

function buildEmptyForm(defaultPartnerOrg?: string): PropertyFormState {
  return {
    name: "",
    address: "",
    partnerOrgId: defaultPartnerOrg ?? "demo-org",
    status: "unassigned",
    description: "",
    existingImages: [],
    removedImages: [],
    uploadFiles: [],
  };
}

export default function AdminPropertiesPage() {
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
    orderByField: { field: "name", direction: "asc" },
    parse: (doc) =>
      ({
        id: doc.id,
        name: doc.name ?? "Untitled property",
        partnerOrgId: doc.partnerOrgId ?? "demo-org",
        address: doc.address ?? doc.location ?? "",
        status: normalizeStatus(doc.status),
        description: doc.description ?? "",
        images: Array.isArray(doc.images) ? doc.images : [],
        taskCount: Number.isFinite(doc.taskCount) ? doc.taskCount : 0,
        createdBy: doc.createdBy ?? null,
        updatedAt: doc.updatedAt ?? undefined,
      }) as AdminProperty,
  });

  const [searchValue, setSearchValue] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("summary");

  const [propertyDrawerOpen, setPropertyDrawerOpen] = useState(false);
  const [propertyFormState, setPropertyFormState] = useState<PropertyFormState>(() =>
    buildEmptyForm(partnerOrgClaim),
  );
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [propertyFormStepIndex, setPropertyFormStepIndex] = useState(0);
  const [propertySaving, setPropertySaving] = useState(false);
  const [propertyError, setPropertyError] = useState<string | null>(null);

  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskFormLoading, setTaskFormLoading] = useState(false);
  const [editingTask, setEditingTask] = useState<PortalTask | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const selectedProperty = useMemo(() => {
    if (!selectedPropertyId) return null;
    return properties.find((item) => item.id === selectedPropertyId) ?? null;
  }, [properties, selectedPropertyId]);

  const editingProperty = useMemo(() => {
    if (!editingPropertyId) return null;
    return properties.find((item) => item.id === editingPropertyId) ?? null;
  }, [properties, editingPropertyId]);

  const {
    data: tasks,
    loading: tasksLoading,
    error: tasksError,
  } = useCollection<PortalTask>({
    path: "tasks",
    enabled: Boolean(selectedPropertyId),
    whereEqual: selectedPropertyId ? [{ field: "propertyId", value: selectedPropertyId }] : undefined,
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

  const filteredProperties = useMemo(() => {
    if (!searchValue.trim()) return properties;
    const queryText = searchValue.trim().toLowerCase();
    return properties.filter((property) =>
      [property.name, property.partnerOrgId, property.address]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(queryText)),
    );
  }, [properties, searchValue]);

  useEffect(() => {
    if (!filteredProperties.length) {
      return;
    }
    if (!selectedPropertyId || !filteredProperties.some((property) => property.id === selectedPropertyId)) {
      setSelectedPropertyId(filteredProperties[0].id);
      setActiveTab("summary");
    }
  }, [filteredProperties, selectedPropertyId]);

  const operatorTaskCount = useMemo(() => {
    return tasks.filter((task) => task.assignment === "teleoperator").length;
  }, [tasks]);

  const resetPropertyForm = useCallback(() => {
    setPropertyFormState(buildEmptyForm(partnerOrgClaim));
    setPropertyFormStepIndex(0);
    setPropertyError(null);
    setEditingPropertyId(null);
  }, [partnerOrgClaim]);

  const openCreatePropertyDrawer = useCallback(() => {
    resetPropertyForm();
    setPropertyDrawerOpen(true);
  }, [resetPropertyForm]);

  const openEditPropertyDrawer = useCallback(
    (property: AdminProperty) => {
      setPropertyFormState({
        name: property.name,
        address: property.address ?? "",
        partnerOrgId: property.partnerOrgId,
        status: property.status,
        description: property.description ?? "",
        existingImages: property.images ?? [],
        removedImages: [],
        uploadFiles: [],
      });
      setPropertyFormStepIndex(0);
      setPropertyError(null);
      setEditingPropertyId(property.id);
      setPropertyDrawerOpen(true);
    },
    [],
  );

  const closePropertyDrawer = useCallback(() => {
    setPropertyDrawerOpen(false);
    setTimeout(() => {
      resetPropertyForm();
    }, 250);
  }, [resetPropertyForm]);

  const nextFormStep = useCallback(() => {
    setPropertyFormStepIndex((index) => Math.min(index + 1, FORM_STEPS.length - 1));
  }, []);

  const previousFormStep = useCallback(() => {
    setPropertyFormStepIndex((index) => Math.max(index - 1, 0));
  }, []);

  async function persistProperty() {
    if (!user) return;

    const trimmedPartnerOrg = propertyFormState.partnerOrgId.trim() || partnerOrgClaim || "demo-org";
    const baseRef = editingPropertyId
      ? doc(firestore, "properties", editingPropertyId)
      : doc(collection(firestore, "properties"));
    const propertyId = baseRef.id;

    setPropertySaving(true);
    setPropertyError(null);

    try {
      await user.getIdToken?.(true);

      if (propertyFormState.removedImages.length) {
        await Promise.all(
          propertyFormState.removedImages.map(async (url) => {
            try {
              const parsed = new URL(url);
              const objectRef = ref(storage, decodeURIComponent(parsed.pathname.replace(/^\//, "")));
              await deleteObject(objectRef);
            } catch (error) {
              console.warn("[admin] failed to remove image", url, error);
            }
          }),
        );
      }

      const uploadedImageUrls: string[] = [];
      for (const file of propertyFormState.uploadFiles) {
        const path = `properties/${propertyId}/${crypto.randomUUID()}-${file.name}`;
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
        partnerOrgId: trimmedPartnerOrg,
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

      await setDoc(baseRef, payload, { merge: Boolean(editingProperty) });

      console.info("[admin] property saved", propertyId);
      setSelectedPropertyId(propertyId);
      closePropertyDrawer();
    } catch (error) {
      console.error("[admin] failed to save property", error);
      const message =
        error instanceof Error ? error.message : "Unable to save property. Verify your admin access.";
      setPropertyError(message);
    } finally {
      setPropertySaving(false);
    }
  }

  async function handleDeleteProperty(property: AdminProperty) {
    const confirmRemoval = window.confirm(
      `Delete property "${property.name}"? This will also remove all associated tasks.`,
    );
    if (!confirmRemoval) return;

    const propertyRef = doc(firestore, "properties", property.id);
    const tasksQuery = query(collection(firestore, "tasks"), where("propertyId", "==", property.id));
    const snapshot = await getDocs(tasksQuery);

    await Promise.all(snapshot.docs.map((taskDoc) => deleteDoc(doc(firestore, "tasks", taskDoc.id))));
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

  function openTaskDrawer(task?: PortalTask) {
    if (task) {
      setEditingTask(task);
    } else {
      setEditingTask(null);
    }
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
        const newTaskRef = doc(collection(firestore, "tasks"));
        await setDoc(newTaskRef, {
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
      setEditingTask(null);
    }
  }

  async function deleteTask(task: PortalTask) {
    if (!selectedProperty) return;
    const confirmRemoval = window.confirm(`Delete task "${task.name}"?`);
    if (!confirmRemoval) return;

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
        <p className="text-sm text-neutral-500">Loading your account…</p>
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
          <CardContent className="space-y-3 text-sm text-neutral-500">
            <p>This area is reserved for administrators.</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/properties">Go back to operator portal</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm lg:sticky lg:top-10 lg:h-[75vh] lg:flex-shrink-0 lg:overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Properties</h2>
              <p className="text-xs text-neutral-500">Select a property to manage details</p>
            </div>
            <Button size="icon" variant="outline" onClick={openCreatePropertyDrawer} aria-label="Create property">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search by name or partner…"
                className="pl-9"
              />
            </label>
          </div>
          <div className="mt-4 h-[calc(100%-128px)] overflow-y-auto pr-1">
            {propertiesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded-xl bg-neutral-100" />
                ))}
              </div>
            ) : filteredProperties.length ? (
              <ul className="space-y-2">
                {filteredProperties.map((property) => {
                  const isActive = selectedPropertyId === property.id;
                  return (
                    <li key={property.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPropertyId(property.id);
                          setActiveTab("summary");
                        }}
                        className={cn(
                          "w-full rounded-xl border border-neutral-200 px-4 py-3 text-left transition hover:border-neutral-300 hover:bg-neutral-50",
                          isActive && "border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-900",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{property.name}</span>
                          <Badge variant={property.status === "scheduled" ? "default" : "secondary"}>
                            {property.status === "scheduled" ? "Scheduled" : "Unassigned"}
                          </Badge>
                        </div>
                        <p className={cn("mt-1 text-xs", isActive ? "text-neutral-200" : "text-neutral-500")}
                        >
                          {property.partnerOrgId}
                        </p>
                        {property.address ? (
                          <p className={cn("mt-1 line-clamp-1 text-xs", isActive ? "text-neutral-200" : "text-neutral-400")}
                          >
                            {property.address}
                          </p>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="mt-6 space-y-3 text-sm text-neutral-500">
                {propertiesError ? <p>{propertiesError}</p> : <p>No properties found.</p>}
                <Button variant="outline" onClick={openCreatePropertyDrawer} className="w-full">
                  <Plus className="mr-2 h-4 w-4" /> Create property
                </Button>
              </div>
            )}
          </div>
        </aside>

        <section className="flex-1 space-y-6">
          {selectedProperty ? (
            <div className="space-y-6">
              <header className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-semibold text-neutral-900">{selectedProperty.name}</h1>
                    <p className="flex items-center gap-2 text-sm text-neutral-500">
                      <Layers className="h-4 w-4" /> {selectedProperty.partnerOrgId}
                    </p>
                    {selectedProperty.address && (
                      <p className="mt-1 flex items-center gap-2 text-sm text-neutral-500">
                        <MapPin className="h-4 w-4" /> {selectedProperty.address}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={selectedProperty.status === "scheduled" ? "default" : "secondary"}>
                      {selectedProperty.status === "scheduled" ? "Scheduled" : "Unassigned"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleTogglePropertyStatus(
                          selectedProperty,
                          selectedProperty.status !== "scheduled",
                        )
                      }
                    >
                      {selectedProperty.status === "scheduled" ? "Mark unassigned" : "Mark scheduled"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEditPropertyDrawer(selectedProperty)}>
                      <Edit3 className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button variant="default" size="sm" onClick={() => openTaskDrawer()}>
                      <FilePlus2 className="mr-2 h-4 w-4" /> Add task
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/property/${selectedProperty.id}`}>
                        <ExternalLink className="mr-2 h-4 w-4" /> Open property page
                      </Link>
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <p className="text-xs uppercase text-neutral-500">Teleoperator tasks</p>
                    <p className="mt-1 text-2xl font-semibold text-neutral-900">{operatorTaskCount}</p>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <p className="text-xs uppercase text-neutral-500">Total tasks</p>
                    <p className="mt-1 text-2xl font-semibold text-neutral-900">{tasks.length}</p>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <p className="text-xs uppercase text-neutral-500">Last updated</p>
                    <p className="mt-1 text-sm text-neutral-700">
                      {selectedProperty.updatedAt
                        ? new Date(selectedProperty.updatedAt).toLocaleString()
                        : "Not yet updated"}
                    </p>
                  </div>
                </div>
              </header>

              <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-6 py-3">
                  <div className="flex items-center gap-2">
                    {DETAIL_TABS.map((tab) => (
                      <Button
                        key={tab}
                        variant={activeTab === tab ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setActiveTab(tab)}
                      >
                        {tab === "summary" && "Summary"}
                        {tab === "media" && "Media"}
                        {tab === "tasks" && "Tasks"}
                      </Button>
                    ))}
                  </div>
                  {activeTab === "tasks" ? (
                    <Button size="sm" onClick={() => openTaskDrawer()}>
                      <Plus className="mr-2 h-4 w-4" /> New task
                    </Button>
                  ) : null}
                </div>

                <div className="px-6 py-5">
                  {activeTab === "summary" ? (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-800">Overview</h3>
                        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                          {selectedProperty.description || "No description provided yet."}
                        </p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Card className="border-neutral-200">
                          <CardHeader>
                            <CardTitle className="text-sm font-semibold text-neutral-700">Partner organisation</CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-neutral-600">
                            {selectedProperty.partnerOrgId}
                          </CardContent>
                        </Card>
                        <Card className="border-neutral-200">
                          <CardHeader>
                            <CardTitle className="text-sm font-semibold text-neutral-700">Address</CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-neutral-600">
                            {selectedProperty.address || "Add an address to help operators navigate."}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ) : null}

                  {activeTab === "media" ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-neutral-800">Media library</h3>
                          <p className="text-xs text-neutral-500">Upload reference photos or floor plans for operators.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => openEditPropertyDrawer(selectedProperty)}>
                          <UploadCloud className="mr-2 h-4 w-4" /> Manage media
                        </Button>
                      </div>
                      {selectedProperty.images.length ? (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {selectedProperty.images.map((url) => (
                            <div key={url} className="relative h-40 w-full overflow-hidden rounded-xl border border-neutral-200">
                              <Image src={url} alt={selectedProperty.name} fill className="object-cover" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-sm text-neutral-500">
                          No media uploaded yet. Add imagery so operators know what to expect on site.
                        </div>
                      )}
                    </div>
                  ) : null}

                  {activeTab === "tasks" ? (
                    <div className="space-y-4">
                      {tasksError ? (
                        <p className="text-sm text-red-600">{tasksError}</p>
                      ) : null}
                      {tasksLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="h-16 animate-pulse rounded-xl bg-neutral-100" />
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
                                  <Button size="sm" variant="outline" onClick={() => openTaskDrawer(task)}>
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
                        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-sm text-neutral-500">
                          No tasks yet. Create a task to assign work to your operators.
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              <Button variant="ghost" size="sm" onClick={() => router.push("/properties")}
                className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900">
                <ArrowLeft className="h-4 w-4" /> Go to operator view
              </Button>
            </div>
          ) : (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-4 rounded-2xl border border-neutral-200 bg-white p-12 text-center text-neutral-500 shadow-sm">
              <div className="rounded-full bg-neutral-100 p-3">
                <Layers className="h-6 w-6 text-neutral-400" />
              </div>
              <div className="max-w-sm space-y-2">
                <h2 className="text-xl font-semibold text-neutral-900">Choose a property to get started</h2>
                <p className="text-sm text-neutral-500">
                  Browse the list on the left or create a new property to begin managing tasks and media.
                </p>
              </div>
              <Button onClick={openCreatePropertyDrawer}>
                <Plus className="mr-2 h-4 w-4" /> Create property
              </Button>
            </div>
          )}
        </section>
      </section>

      <Sheet open={propertyDrawerOpen} onOpenChange={(open) => (open ? setPropertyDrawerOpen(true) : closePropertyDrawer())}>
        <SheetContent className="w-full max-w-xl border-l border-neutral-200">
          <div className="flex h-full flex-col pt-16">
            <div className="flex-1 overflow-y-auto px-6">
              <SheetHeader className="space-y-2">
                <SheetTitle>{editingProperty ? "Edit property" : "Create property"}</SheetTitle>
                <SheetDescription>
                  {editingProperty
                    ? "Update the essentials, details, and media for this property."
                    : "Add a new location for teleoperators with clear context and visual references."}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
                  <span>Step {propertyFormStepIndex + 1} of {FORM_STEPS.length}</span>
                  <span>{FORM_STEPS[propertyFormStepIndex]}</span>
                </div>
                <div className="h-1 w-full rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-neutral-900 transition-all"
                    style={{ width: `${((propertyFormStepIndex + 1) / FORM_STEPS.length) * 100}%` }}
                  />
                </div>

                {propertyError && (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {propertyError}
                  </p>
                )}

                {propertyFormStepIndex === 0 ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="property-name">Property name</Label>
                      <Input
                        id="property-name"
                        value={propertyFormState.name}
                        onChange={(event) =>
                          setPropertyFormState((prev) => ({ ...prev, name: event.target.value }))
                        }
                        placeholder="Skyline Tower, Level 4"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="property-partner">Partner organisation</Label>
                      <Input
                        id="property-partner"
                        value={propertyFormState.partnerOrgId}
                        onChange={(event) =>
                          setPropertyFormState((prev) => ({ ...prev, partnerOrgId: event.target.value }))
                        }
                        placeholder="demo-org"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="property-address">Address</Label>
                      <Input
                        id="property-address"
                        value={propertyFormState.address}
                        onChange={(event) =>
                          setPropertyFormState((prev) => ({ ...prev, address: event.target.value }))
                        }
                        placeholder="123 Market Street, San Francisco"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="property-status">Status</Label>
                      <select
                        id="property-status"
                        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                        value={propertyFormState.status}
                        onChange={(event) =>
                          setPropertyFormState((prev) => ({
                            ...prev,
                            status: event.target.value as PropertyStatus,
                          }))
                        }
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="unassigned">Unassigned</option>
                      </select>
                    </div>
                  </div>
                ) : null}

                {propertyFormStepIndex === 1 ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="property-description">Description</Label>
                      <textarea
                        id="property-description"
                        rows={5}
                        className="flex w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                        placeholder="Share a short briefing for operators…"
                        value={propertyFormState.description}
                        onChange={(event) =>
                          setPropertyFormState((prev) => ({ ...prev, description: event.target.value }))
                        }
                      />
                    </div>
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
                      Tip: include access instructions, preferred contact details, or links to standard operating procedures.
                    </div>
                  </div>
                ) : null}

                {propertyFormStepIndex === 2 ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="property-images">Upload imagery</Label>
                      <Input
                        id="property-images"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(event) => {
                          const files = event.target.files;
                          if (!files) return;
                          setPropertyFormState((prev) => ({
                            ...prev,
                            uploadFiles: [...prev.uploadFiles, ...Array.from(files)],
                          }));
                        }}
                      />
                    </div>
                    {propertyFormState.existingImages.length ? (
                      <div>
                        <p className="text-xs font-medium text-neutral-500">Attached imagery</p>
                        <div className="mt-2 grid gap-3 sm:grid-cols-2">
                          {propertyFormState.existingImages.map((url) => {
                            const markedForRemoval = propertyFormState.removedImages.includes(url);
                            return (
                              <div
                                key={url}
                                className={cn(
                                  "relative h-32 w-full overflow-hidden rounded-lg border border-neutral-200",
                                  markedForRemoval && "border-red-300",
                                )}
                              >
                                <Image src={url} alt="Property media" fill className="object-cover" />
                                <Button
                                  size="sm"
                                  variant={markedForRemoval ? "default" : "secondary"}
                                  onClick={() =>
                                    setPropertyFormState((prev) => ({
                                      ...prev,
                                      removedImages: markedForRemoval
                                        ? prev.removedImages.filter((item) => item !== url)
                                        : [...prev.removedImages, url],
                                    }))
                                  }
                                  className="absolute left-2 top-2"
                                >
                                  {markedForRemoval ? "Keep" : "Remove"}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                    {propertyFormState.uploadFiles.length ? (
                      <div>
                        <p className="text-xs font-medium text-neutral-500">Pending uploads</p>
                        <ul className="mt-2 space-y-2 text-sm text-neutral-600">
                          {propertyFormState.uploadFiles.map((file, index) => (
                            <li key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                              <span className="truncate pr-2">{file.name}</span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setPropertyFormState((prev) => ({
                                    ...prev,
                                    uploadFiles: prev.uploadFiles.filter((_, fileIndex) => fileIndex !== index),
                                  }))
                                }
                              >
                                Remove
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            <SheetFooter className="border-t border-neutral-200 px-6 py-4">
              <div className="flex flex-1 items-center gap-2 text-xs text-neutral-500">
                <span>{FORM_STEPS[propertyFormStepIndex]}</span>
              </div>
              <div className="flex gap-2">
                {propertyFormStepIndex > 0 && (
                  <Button variant="outline" type="button" onClick={previousFormStep} disabled={propertySaving}>
                    Back
                  </Button>
                )}
                {propertyFormStepIndex < FORM_STEPS.length - 1 ? (
                  <Button
                    type="button"
                    onClick={nextFormStep}
                    disabled={propertySaving || !propertyFormState.name.trim()}
                  >
                    Continue
                  </Button>
                ) : (
                  <Button type="button" onClick={persistProperty} disabled={propertySaving}>
                    {propertySaving ? "Saving…" : editingProperty ? "Save changes" : "Create property"}
                  </Button>
                )}
              </div>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>

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
              : `Create a task for ${selectedProperty.name}.`
          }
          initialValues={
            editingTask
              ? {
                  name: editingTask.name,
                  type: "general",
                  duration: editingTask.duration,
                  priority: editingTask.priority,
                  assignment: editingTask.assignment,
                  status: editingTask.status,
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
