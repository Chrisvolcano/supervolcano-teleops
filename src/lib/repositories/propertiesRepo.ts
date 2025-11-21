import {
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type FirestoreError,
} from "firebase/firestore";

import { db } from "@/lib/firebaseClient";
import { toTimestampLike } from "@/lib/format";
import type { PropertyMediaItem, PropertyStatus, SVProperty } from "@/lib/types";

const collectionRef = () => collection(db, "locations");

type WatchOptions = {
  partnerOrgId?: string;
  includeInactive?: boolean;
  enabled?: boolean;
};

export function watchProperties(
  onChange: (items: SVProperty[]) => void,
  onError?: (error: FirestoreError) => void,
  options: WatchOptions = {},
) {
  if (options.enabled === false) {
    return () => undefined;
  }

  const constraints = [];
  if (options.partnerOrgId) {
    constraints.push(where("partnerOrgId", "==", options.partnerOrgId));
  }
  if (!options.includeInactive) {
    constraints.push(where("isActive", "==", true));
  }
  constraints.push(orderBy("createdAt", "desc"));

  const q = query(collectionRef(), ...constraints);
  return onSnapshot(
    q,
    (snapshot) => {
      const items: SVProperty[] = snapshot.docs.map((docSnap) => normalize(docSnap.id, docSnap.data()));
      onChange(items);
    },
    onError,
  );
}

export async function createProperty(input: {
  id?: string;
  name: string;
  partnerOrgId: string;
  address?: string;
  description?: string;
  images?: string[];
  media?: PropertyMediaItem[];
  status?: PropertyStatus;
  createdBy: string;
}) {
  try {
    console.log("[repo] createProperty:start", { 
      name: input.name, 
      partnerOrgId: input.partnerOrgId,
      createdBy: input.createdBy,
      hasId: !!input.id,
    });
    
    const payload = buildPayload(input);
    console.log("[repo] createProperty:payload built", { 
      hasName: !!payload.name,
      hasPartnerOrgId: !!payload.partnerOrgId,
      hasCreatedBy: !!payload.createdBy,
    });
    
    if (input.id) {
      // If ID is provided, use it (for migrations or specific ID requirements)
      console.log("[repo] createProperty:using provided ID", input.id);
      const ref = doc(db, "locations", input.id);
      await setDoc(ref, payload);
      console.log("[repo] createProperty:setDoc completed", input.id);
      return input.id;
    }
    
    // Use addDoc to generate a unique Firestore UUID and save with admin's createdBy field
    // This ensures every location has a unique UUID and is associated with the creating admin
    console.log("[repo] createProperty:calling addDoc...");
    const collection = collectionRef();
    console.log("[repo] createProperty:collection ref obtained", collection.path);
    console.log("[repo] createProperty:payload to save", {
      name: payload.name,
      partnerOrgId: payload.partnerOrgId,
      hasCreatedBy: !!payload.createdBy,
      createdBy: payload.createdBy,
      hasCreatedAt: !!payload.createdAt,
    });
    
    try {
      console.log("[repo] createProperty:awaiting addDoc...");
      console.log("[repo] createProperty:collection path", collection.path);
      console.log("[repo] createProperty:db instance", db.app.name);
      
      // Add timeout wrapper to catch hanging requests
      const addDocWithTimeout = Promise.race([
        addDoc(collection, payload),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("addDoc timed out after 15 seconds - check Firestore rules and network connection")), 15000)
        ),
      ]);
      
      const docRef = await addDocWithTimeout as Awaited<ReturnType<typeof addDoc>>;
      console.log("[repo] createProperty:addDoc SUCCESS", { id: docRef.id, path: docRef.path });
      return docRef.id;
    } catch (addDocError) {
      const firestoreError = addDocError as any;
      console.error("[repo] createProperty:addDoc FAILED", {
        error: addDocError,
        errorCode: firestoreError?.code,
        errorMessage: addDocError instanceof Error ? addDocError.message : String(addDocError),
        errorStack: addDocError instanceof Error ? addDocError.stack : undefined,
        firestoreCode: firestoreError?.code,
        firestoreMessage: firestoreError?.message,
        // Firestore permission errors have specific codes
        isPermissionError: firestoreError?.code === 'permission-denied' || 
                          firestoreError?.code === 7 ||
                          (addDocError instanceof Error && addDocError.message.includes('permission')),
        payload: {
          name: payload.name,
          partnerOrgId: payload.partnerOrgId,
          createdBy: payload.createdBy,
        },
      });
      
      // If it's a permission error, provide more helpful message
      if (firestoreError?.code === 'permission-denied' || firestoreError?.code === 7) {
        throw new Error(`Firestore permission denied. Check: 1) Rules are published (not just saved), 2) Token has admin role, 3) Rules allow create on /locations. Original: ${firestoreError?.message || String(addDocError)}`);
      }
      
      throw addDocError;
    }
  } catch (error) {
    console.error("[repo] createProperty:error", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      input: {
        name: input.name,
        partnerOrgId: input.partnerOrgId,
        createdBy: input.createdBy,
      },
    });
    throw error;
  }
}

export async function updateProperty(
  id: string,
  patch: Partial<Omit<SVProperty, "id">>,
  updatedBy?: string,
) {
  const ref = doc(db, "locations", id);
  const payload = sanitizePatch(patch);
  await setDoc(ref, { 
    ...payload, 
    updatedAt: serverTimestamp(),
    ...(updatedBy ? { updatedBy } : {}),
  }, { merge: true });
}

export async function updatePropertyTaskCount(id: string, delta: number) {
  const ref = doc(db, "locations", id);
  await updateDoc(ref, {
    taskCount: increment(delta),
    updatedAt: serverTimestamp(),
  });
}

function buildPayload(input: {
  name: string;
  partnerOrgId: string;
  address?: string;
  description?: string;
  images?: string[];
  media?: PropertyMediaItem[];
  status?: PropertyStatus;
  createdBy: string;
}) {
  const media = Array.isArray(input.media) ? input.media : [];
  const imageUrls = input.images ?? media.filter((item) => item.type === "image").map((item) => item.url);
  return {
    name: input.name.trim(),
    partnerOrgId: input.partnerOrgId.trim(),
    address: input.address?.trim() ?? "",
    description: input.description?.trim() ?? "",
    images: imageUrls,
    media,
    imageCount: media.filter((item) => item.type === "image").length || imageUrls.length,
    videoCount: media.filter((item) => item.type === "video").length,
    status: input.status ?? "unassigned",
    isActive: true,
    taskCount: 0,
    createdBy: input.createdBy, // Admin's UID - associates this location with the creating admin
    createdAt: serverTimestamp(), // Firestore server timestamp for accurate creation time
    updatedAt: serverTimestamp(),
  };
}

function sanitizePatch(patch: Partial<Omit<SVProperty, "id">>) {
  const data: Record<string, unknown> = {};
  if (typeof patch.name === "string") {
    data.name = patch.name.trim();
  }
  if (typeof patch.partnerOrgId === "string") {
    data.partnerOrgId = patch.partnerOrgId.trim();
  }
  if (typeof patch.address === "string") {
    data.address = patch.address.trim();
  }
  if (typeof patch.description === "string") {
    data.description = patch.description.trim();
  }
  if (Array.isArray(patch.images)) {
    data.images = patch.images;
  }
  if (Array.isArray(patch.media)) {
    data.media = patch.media;
  }
  if (typeof patch.imageCount === "number") {
    data.imageCount = patch.imageCount;
  }
  if (typeof patch.videoCount === "number") {
    data.videoCount = patch.videoCount;
  }
  if (patch.status) {
    data.status = patch.status;
  }
  if (typeof patch.isActive === "boolean") {
    data.isActive = patch.isActive;
  }
  if (typeof patch.taskCount === "number") {
    data.taskCount = patch.taskCount;
  }
  if (patch.createdBy !== undefined) {
    data.createdBy = patch.createdBy;
  }
  if (patch.createdAt !== undefined) {
    data.createdAt = patch.createdAt;
  }
  if (patch.updatedAt !== undefined) {
    data.updatedAt = patch.updatedAt;
  }
  if (patch.updatedBy !== undefined) {
    data.updatedBy = patch.updatedBy;
  }
  return data;
}

function normalize(id: string, data: DocumentData): SVProperty {
  const media = normalizeMedia(data);
  const imageUrls = media.filter((item) => item.type === "image").map((item) => item.url);
  return {
    id,
    name: typeof data.name === "string" ? data.name : "Untitled property",
    partnerOrgId:
      typeof data.partnerOrgId === "string" ? data.partnerOrgId : data.partner_org_id ?? "unknown",
    address: typeof data.address === "string" ? data.address : data.location ?? "",
    description: typeof data.description === "string" ? data.description : "",
    images: Array.isArray(data.images) ? (data.images as string[]) : imageUrls,
    media,
    imageCount: Number.isFinite(data.imageCount) ? Number(data.imageCount) : imageUrls.length,
    videoCount: Number.isFinite(data.videoCount)
      ? Number(data.videoCount)
      : media.filter((item) => item.type === "video").length,
    status:
      data.status === "scheduled" || data.status === "unassigned"
        ? data.status
        : (data.status as PropertyStatus) ?? "unassigned",
    isActive: typeof data.isActive === "boolean" ? data.isActive : true,
    taskCount: Number.isFinite(data.taskCount) ? Number(data.taskCount) : 0,
    createdBy: typeof data.createdBy === "string" ? data.createdBy : data.created_by ?? null,
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : data.updated_by ?? null,
    createdAt: data.createdAt ?? data.created_at ?? null,
    updatedAt: data.updatedAt ?? data.updated_at ?? null,
  };
}

function normalizeMedia(data: DocumentData): PropertyMediaItem[] {
  const fallbackFromImages = () => {
    if (!Array.isArray(data.images)) return [];
    return (data.images as unknown[])
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .map((url) => ({
        id: url,
        url,
        type: "image" as const,
      }));
  };

  if (!Array.isArray(data.media)) {
    return fallbackFromImages();
  }

  const normalized: PropertyMediaItem[] = [];
  for (const raw of data.media as unknown[]) {
    if (typeof raw !== "object" || raw === null) continue;
    const candidate = raw as Record<string, unknown>;
    const url = typeof candidate.url === "string" ? candidate.url : undefined;
    const type = candidate.type === "video" ? "video" : candidate.type === "image" ? "image" : undefined;
    if (!url || !type) {
      continue;
    }

    const idValue = typeof candidate.id === "string" && candidate.id.length ? candidate.id : url;
    normalized.push({
      id: idValue,
      url,
      type,
      storagePath: typeof candidate.storagePath === "string" ? candidate.storagePath : undefined,
      contentType: typeof candidate.contentType === "string" ? candidate.contentType : null,
      createdAt: toTimestampLike(candidate.createdAt ?? candidate.created_at),
    });
  }

  if (!normalized.length) {
    return fallbackFromImages();
  }

  return normalized;
}
