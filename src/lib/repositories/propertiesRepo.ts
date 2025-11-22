import {
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
    // VERSION: 2.0 - Using setDoc directly (NOT addDoc) - Cache bust
    console.log("[repo] createProperty:start V2.0 (setDoc only)", { 
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
    
    // ALWAYS use setDoc with a generated ID instead of addDoc
    // This works around potential Firestore SDK issues where addDoc hangs
    console.log("[repo] createProperty:generating document ID...");
    const collection = collectionRef();
    const newDocRef = doc(collection);
    const documentId = input.id || newDocRef.id;
    console.log("[repo] createProperty:using document ID", documentId);
    
    // CRITICAL: Create docRef AFTER token refresh to ensure Firestore SDK uses fresh token
    const docRef = doc(db, "locations", documentId);
    console.log("[repo] createProperty:calling setDoc with generated ID...", {
      docPath: docRef.path,
      dbInstance: db.app.name,
      dbProject: db.app.options.projectId,
      documentId,
    });
    
    // Verify auth state - use the auth instance from the same db instance
    // Import it statically (not dynamically) to ensure we're using the same instance
    const { auth } = await import("@/lib/firebaseClient");
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("No authenticated user - cannot create location");
    }
    console.log("[repo] createProperty:auth user", {
      uid: currentUser.uid,
      email: currentUser.email,
    });
    
    // CRITICAL: Force token refresh to ensure Firestore SDK uses fresh token with admin role
    // The Firestore SDK automatically uses the latest token from auth.currentUser
    // By forcing a refresh here, we ensure the SDK picks up the latest token before setDoc
    const token = await currentUser.getIdToken(true); // Force refresh!
    
    // Decode token to verify admin role is present
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const tokenRole = payload.role;
      console.log("[repo] createProperty:got FRESH auth token (forced refresh)", {
        tokenLength: token.length,
        hasToken: !!token,
        role: tokenRole,
        hasAdminRole: tokenRole === "admin",
        partnerOrgId: payload.partner_org_id,
      });
      
      if (tokenRole !== "admin") {
        throw new Error(`Token does not have admin role! Role is: "${tokenRole || 'undefined'}". Please sign out and sign back in, or run: npm run set-admin`);
      }
    } catch (decodeError) {
      console.warn("[repo] createProperty:could not decode token (continuing anyway)", decodeError);
    }
    
    // Give Firestore SDK a moment to pick up the refreshed token
    // This ensures setDoc uses the token we just refreshed
    await new Promise(resolve => setTimeout(resolve, 200)); // Increased to 200ms
    
    // Check payload structure (but don't JSON.stringify - serverTimestamp() and Date objects are valid for Firestore)
    console.log("[repo] createProperty:payload structure check", {
      hasName: !!payload.name,
      hasPartnerOrgId: !!payload.partnerOrgId,
      hasCreatedBy: !!payload.createdBy,
      hasCreatedAt: !!payload.createdAt,
      hasUpdatedAt: !!payload.updatedAt,
      mediaCount: Array.isArray(payload.media) ? payload.media.length : 0,
      payloadKeys: Object.keys(payload),
    });
    
    const startTime = Date.now();
    try {
      console.log("[repo] createProperty:awaiting setDoc...", {
        docPath: docRef.path,
        payloadKeys: Object.keys(payload),
        payloadFields: {
          name: payload.name,
          partnerOrgId: payload.partnerOrgId,
          createdBy: payload.createdBy,
          hasCreatedAt: !!payload.createdAt,
          hasUpdatedAt: !!payload.updatedAt,
          mediaCount: Array.isArray(payload.media) ? payload.media.length : 0,
        },
      });
      
      // Try setDoc with a timeout - but also add error listener to catch permission errors early
      let timeoutId: NodeJS.Timeout | null = null;
      let hasCompleted = false;
      
      const setDocPromise = setDoc(docRef, payload)
        .then(() => {
          hasCompleted = true;
          if (timeoutId) clearTimeout(timeoutId);
          const duration = Date.now() - startTime;
          console.log(`[repo] createProperty:setDoc completed in ${duration}ms`, documentId);
          return documentId;
        })
        .catch((error) => {
          hasCompleted = true;
          if (timeoutId) clearTimeout(timeoutId);
          throw error;
        });
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          if (!hasCompleted) {
            const duration = Date.now() - startTime;
            console.error(`[repo] createProperty:setDoc TIMED OUT after ${duration}ms`);
            console.error("[repo] createProperty:This indicates a Firestore connection or rules issue");
            console.error("[repo] createProperty:Check Network tab for blocked requests to firestore.googleapis.com");
            reject(new Error(`setDoc timed out after ${duration}ms - This usually means: 1) Firestore rules are blocking (check token has admin role), 2) Network issue, or 3) Firestore service problem`));
          }
        }, 10000);
      });
      
      const result = await Promise.race([setDocPromise, timeoutPromise]);
      return result;
    } catch (setDocError) {
      const duration = Date.now() - startTime;
      const firestoreError = setDocError as any;
      console.error(`[repo] createProperty:setDoc failed after ${duration}ms`, {
        error: setDocError,
        errorCode: firestoreError?.code,
        errorMessage: setDocError instanceof Error ? setDocError.message : String(setDocError),
        firestoreCode: firestoreError?.code,
        firestoreMessage: firestoreError?.message,
        isPermissionError: firestoreError?.code === 'permission-denied' || firestoreError?.code === 7,
        documentId,
        payload: {
          name: payload.name,
          partnerOrgId: payload.partnerOrgId,
          createdBy: payload.createdBy,
        },
      });
      
      if (firestoreError?.code === 'permission-denied' || firestoreError?.code === 7) {
        throw new Error(`Firestore permission denied. Check: 1) Rules are published, 2) Token has admin role, 3) Rules allow create on /locations. Original: ${firestoreError?.message || String(setDocError)}`);
      }
      
      throw setDocError;
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
  // Ensure fresh token for admin operations
  const { auth } = await import("@/lib/firebaseClient");
  const currentUser = auth.currentUser;
  if (currentUser) {
    // Force token refresh to ensure admin role is present
    await currentUser.getIdToken(true);
    // Small delay to ensure Firestore SDK picks up refreshed token
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
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
  // Validate required fields
  const trimmedName = input.name?.trim() || "";
  if (!trimmedName) {
    throw new Error("name is required and cannot be empty");
  }
  
  const trimmedPartnerOrgId = input.partnerOrgId?.trim() || "";
  if (!trimmedPartnerOrgId) {
    throw new Error("partnerOrgId is required and cannot be empty");
  }
  
  if (!input.createdBy || input.createdBy.trim() === "") {
    throw new Error("createdBy is required and cannot be empty");
  }
  
  const media = Array.isArray(input.media) ? input.media : [];
  const imageUrls = input.images ?? media.filter((item) => item.type === "image").map((item) => item.url);
  
  // Clean media array - convert Date objects to ISO strings for Firestore compatibility
  const cleanedMedia = media.map((item) => ({
    ...item,
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
  }));
  
  return {
    name: trimmedName,
    partnerOrgId: trimmedPartnerOrgId,
    address: input.address?.trim() ?? "",
    description: input.description?.trim() ?? "",
    images: imageUrls,
    media: cleanedMedia,
    imageCount: media.filter((item) => item.type === "image").length || imageUrls.length,
    videoCount: media.filter((item) => item.type === "video").length,
    status: input.status ?? "unassigned",
    isActive: true,
    taskCount: 0,
    createdBy: input.createdBy.trim(), // Admin's UID - associates this location with the creating admin
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
    createdAt: toTimestampLike(data.createdAt ?? data.created_at),
    updatedAt: toTimestampLike(data.updatedAt ?? data.updated_at),
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
