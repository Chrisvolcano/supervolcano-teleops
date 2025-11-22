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
    
    // ALWAYS use setDoc with a generated ID instead of addDoc
    // This works around potential Firestore SDK issues where addDoc hangs
    console.log("[repo] createProperty:generating document ID...");
    const collection = collectionRef();
    const newDocRef = doc(collection);
    const documentId = input.id || newDocRef.id;
    console.log("[repo] createProperty:using document ID", documentId);
    
    const docRef = doc(db, "locations", documentId);
    console.log("[repo] createProperty:calling setDoc with generated ID...");
    console.log("[repo] createProperty:doc path", docRef.path);
    console.log("[repo] createProperty:db instance", db.app.name);
    console.log("[repo] createProperty:db project", db.app.options.projectId);
    
    // Verify auth state
    const { auth } = await import("@/lib/firebaseClient");
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("No authenticated user - cannot create location");
    }
    console.log("[repo] createProperty:auth user", {
      uid: currentUser.uid,
      email: currentUser.email,
    });
    
    // Get fresh token to ensure it's included
    const token = await currentUser.getIdToken(false);
    console.log("[repo] createProperty:got auth token", {
      tokenLength: token.length,
      hasToken: !!token,
    });
    
    const startTime = Date.now();
    try {
      console.log("[repo] createProperty:awaiting setDoc...");
      // Add timeout wrapper
      const setDocPromise = setDoc(docRef, payload);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("setDoc timed out after 10 seconds")), 10000)
      );
      
      await Promise.race([setDocPromise, timeoutPromise]);
      const duration = Date.now() - startTime;
      console.log(`[repo] createProperty:setDoc completed in ${duration}ms`, documentId);
      return documentId;
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
    
    /* OLD CODE - REMOVED DUE TO addDoc HANGING
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
      console.log("[repo] createProperty:db project", db.app.options.projectId);
      
      // Verify auth state before attempting write
      const { getAuth } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebaseClient");
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("No authenticated user - cannot create location");
      }
      console.log("[repo] createProperty:auth user verified", {
        uid: currentUser.uid,
        email: currentUser.email,
      });
      
      // Note: Token refresh is already done in persistProperty, so we don't need to do it again here
      // The Firestore SDK will automatically include the current auth token in requests
      
      // Try addDoc - but first verify the collection reference is valid
      console.log("[repo] createProperty:collection details", {
        id: collection.id,
        path: collection.path,
        parent: collection.parent?.path,
      });
      
      // Verify payload is serializable and valid
      if (!payload.name || payload.name === "") {
        console.warn("[repo] createProperty:payload has empty name", { payloadName: payload.name });
      }
      if (!payload.partnerOrgId || payload.partnerOrgId.trim() === "") {
        throw new Error("partnerOrgId is required and cannot be empty");
      }
      if (!payload.createdBy || payload.createdBy.trim() === "") {
        throw new Error("createdBy is required and cannot be empty");
      }
      
      console.log("[repo] createProperty:payload check", {
        hasName: !!payload.name && payload.name.trim().length > 0,
        nameValue: payload.name,
        nameLength: payload.name?.length || 0,
        hasPartnerOrgId: !!payload.partnerOrgId,
        hasCreatedBy: !!payload.createdBy,
        payloadKeys: Object.keys(payload),
        payloadSize: JSON.stringify(payload).length,
      });
      
      // Ensure Firestore is online - check if enableNetwork is available
      try {
        const firestoreModule = await import("firebase/firestore");
        if (typeof firestoreModule.enableNetwork === "function") {
          console.log("[repo] createProperty:ensuring Firestore network is enabled...");
          await firestoreModule.enableNetwork(db);
          console.log("[repo] createProperty:Firestore network enabled");
        } else {
          console.log("[repo] createProperty:enableNetwork not available in this Firestore version");
        }
      } catch (networkError) {
        // If enableNetwork fails, log but continue - the SDK should handle offline mode
        console.warn("[repo] createProperty:could not enable network (this is ok if already online)", networkError);
      }
      
      // Try addDoc - but first check if we can use setDoc with a generated ID as fallback
      console.log("[repo] createProperty:starting addDoc promise...");
      const startTime = Date.now();
      
      // Generate a document ID upfront so we can use setDoc as fallback if addDoc hangs
      const newDocRef = doc(collection);
      const generatedId = newDocRef.id;
      console.log("[repo] createProperty:generated document ID", generatedId);
      
      // Try addDoc first (preferred method)
      const addDocPromise = addDoc(collection, payload).then((ref) => {
        const duration = Date.now() - startTime;
        console.log(`[repo] createProperty:addDoc completed in ${duration}ms`, { id: ref.id });
        return ref;
      }).catch((err) => {
        const duration = Date.now() - startTime;
        console.error(`[repo] createProperty:addDoc failed after ${duration}ms`, err);
        // If addDoc fails, try setDoc with the generated ID as fallback
        console.log("[repo] createProperty:trying setDoc fallback with generated ID", generatedId);
        const fallbackRef = doc(collection, generatedId);
        return setDoc(fallbackRef, payload).then(() => {
          console.log("[repo] createProperty:setDoc fallback succeeded", generatedId);
          return fallbackRef;
        }).catch((fallbackErr) => {
          console.error("[repo] createProperty:setDoc fallback also failed", fallbackErr);
          throw err; // Throw original error
        });
      });
      
      // Add timeout - if addDoc hangs, try setDoc as fallback
      const timeoutPromise = new Promise<ReturnType<typeof doc>>((resolve, reject) => 
        setTimeout(async () => {
          const duration = Date.now() - startTime;
          console.error(`[repo] createProperty:TIMEOUT - addDoc took longer than 15 seconds (${duration}ms)`);
          console.log("[repo] createProperty:attempting setDoc fallback due to timeout...");
          console.log("[repo] createProperty:fallback payload", {
            name: payload.name,
            partnerOrgId: payload.partnerOrgId,
            hasCreatedBy: !!payload.createdBy,
            payloadKeys: Object.keys(payload),
          });
          
          // Try setDoc as fallback when timeout occurs
          try {
            const fallbackRef = doc(collection, generatedId);
            console.log("[repo] createProperty:fallback doc ref created", { id: fallbackRef.id, path: fallbackRef.path });
            console.log("[repo] createProperty:calling setDoc fallback...");
            const setDocStartTime = Date.now();
            
            // Add a timeout for setDoc too, in case it also hangs
            const setDocWithTimeout = Promise.race([
              setDoc(fallbackRef, payload),
              new Promise<never>((_, setDocReject) => 
                setTimeout(() => {
                  const setDocDuration = Date.now() - setDocStartTime;
                  console.error(`[repo] createProperty:setDoc fallback also timed out after ${setDocDuration}ms`);
                  setDocReject(new Error("setDoc fallback also timed out - this indicates a deeper Firestore connection issue"));
                }, 10000) // 10 second timeout for setDoc
              ),
            ]);
            
            await setDocWithTimeout;
            const setDocDuration = Date.now() - setDocStartTime;
            console.log(`[repo] createProperty:setDoc fallback succeeded after ${setDocDuration}ms`, generatedId);
            resolve(fallbackRef);
          } catch (fallbackErr) {
            const setDocDuration = Date.now() - startTime;
            console.error(`[repo] createProperty:setDoc fallback failed after ${setDocDuration}ms`, {
              error: fallbackErr,
              errorMessage: fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr),
              errorCode: (fallbackErr as any)?.code,
            });
            reject(new Error(`addDoc timed out and setDoc fallback also failed: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`));
          }
        }, 15000) // Reduced to 15 seconds to fail faster
      );
      
      try {
        const docRef = await Promise.race([addDocPromise, timeoutPromise]);
        console.log("[repo] createProperty:write operation completed", { id: docRef.id, path: docRef.path });
        return docRef.id;
      } catch (raceError) {
        // If both addDoc and setDoc failed, log detailed error
        console.error("[repo] createProperty:all write methods failed", {
          error: raceError,
          errorMessage: raceError instanceof Error ? raceError.message : String(raceError),
          generatedId,
          payload: {
            name: payload.name,
            partnerOrgId: payload.partnerOrgId,
            hasCreatedBy: !!payload.createdBy,
          },
        });
        throw raceError;
      }
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
  
  return {
    name: trimmedName,
    partnerOrgId: trimmedPartnerOrgId,
    address: input.address?.trim() ?? "",
    description: input.description?.trim() ?? "",
    images: imageUrls,
    media,
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
