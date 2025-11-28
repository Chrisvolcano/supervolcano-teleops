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

// Cache the discovered database ID to avoid testing on every write
let cachedDatabaseId: string | null = null;

// Helper function to discover the correct database ID by trying to read an existing document
async function discoverDatabaseId(projectId: string, token: string): Promise<string> {
  // Return cached value if available
  if (cachedDatabaseId) {
    console.log("[repo] ✅ Using cached database ID:", cachedDatabaseId);
    return cachedDatabaseId;
  }
  // Since database exists and we can see collections, try reading an existing document
  // This will tell us the correct database ID
  const testDocId = "test-manual-123"; // From the user's screenshot
  const testCollection = "locations";
  
  // Try (default) first - most common
  const testUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${testCollection}/${testDocId}`;
  console.log("[repo] 🔍 Testing database ID by reading existing document...", { testUrl });
  
  try {
    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    
    if (response.ok) {
      console.log("[repo] ✅ Database ID (default) works! Document read successful");
      cachedDatabaseId = "(default)";
      return "(default)";
    } else if (response.status === 404) {
      // Try without parentheses - some multi-region databases use "default" not "(default)"
      const testUrl2 = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/default/documents/${testCollection}/${testDocId}`;
      console.log("[repo] ⚠️ (default) failed, trying 'default' without parentheses...", { testUrl2 });
      
      const response2 = await fetch(testUrl2, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (response2.ok) {
        console.log("[repo] ✅ Database ID 'default' (without parentheses) works!");
        cachedDatabaseId = "default";
        return "default";
      } else {
        console.error("[repo] ❌ Both (default) and default failed. Status:", response.status, response2.status);
        // Still return (default) as fallback - might work for writes even if reads fail
        cachedDatabaseId = "(default)";
        return "(default)";
      }
    } else if (response.status === 403) {
      // 403 = database exists but no permission - that's fine, it exists!
      console.log("[repo] ✅ Database (default) exists (403 = permission denied, but DB exists)");
      cachedDatabaseId = "(default)";
      return "(default)";
    } else {
      console.warn("[repo] ⚠️ Unexpected status:", response.status, "- using (default) as fallback");
      cachedDatabaseId = "(default)";
      return "(default)";
    }
  } catch (error) {
    console.warn("[repo] ⚠️ Error testing database ID, using (default):", error);
    cachedDatabaseId = "(default)";
    return "(default)";
  }
}

// REST API fallback function for when SDK fails
// V5.1: Verify database exists before writing
async function writePropertyViaRestApi(
  docRef: ReturnType<typeof doc>,
  payload: any,
  documentId: string,
): Promise<string> {
  console.log("=".repeat(80));
  console.log("[repo] 🚀🚀🚀 writePropertyViaRestApi: CALLED (V5.2 - Test DB ID with read) 🚀🚀🚀");
  console.log("=".repeat(80));
  console.log("[repo] writePropertyViaRestApi:Document ID:", documentId);
  console.log("[repo] writePropertyViaRestApi:Document path:", docRef.path);
  
  const { auth: firebaseAuth } = await import("@/lib/firebaseClient");
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) {
    throw new Error("No authenticated user for REST API fallback");
  }
  const token = await currentUser.getIdToken(true);
  
  const projectId = db.app.options.projectId;
  if (!projectId) {
    throw new Error("Project ID not found in Firebase config");
  }
  
  // Discover the correct database ID by testing with an existing document
  const databaseId = await discoverDatabaseId(projectId, token);
  
  // Convert payload to Firestore REST API format
  const fields: any = {};
  const now = new Date().toISOString();
  
  for (const [key, value] of Object.entries(payload)) {
    if (value === null || value === undefined) continue;
    
    // Handle serverTimestamp() - replace with actual timestamp
    if (value && typeof value === "object" && "toFirestore" in value) {
      if (key === "createdAt" || key === "updatedAt") {
        fields[key] = { timestampValue: now };
      }
      continue;
    }
    
    // Convert field types to Firestore REST API format
    if (typeof value === "string") {
      fields[key] = { stringValue: value };
    } else if (typeof value === "number") {
      fields[key] = Number.isInteger(value)
        ? { integerValue: String(value) }
        : { doubleValue: value };
    } else if (typeof value === "boolean") {
      fields[key] = { booleanValue: value };
    } else if (value instanceof Date) {
      fields[key] = { timestampValue: value.toISOString() };
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        fields[key] = { arrayValue: { values: [] } };
      } else if (typeof value[0] === "string") {
        fields[key] = { arrayValue: { values: value.map(v => ({ stringValue: String(v) })) } };
      } else {
        // Complex array - stringify for now
        fields[key] = { stringValue: JSON.stringify(value) };
      }
    } else if (value && typeof value === "object" && "toDate" in value) {
      fields[key] = { timestampValue: (value as any).toDate().toISOString() };
    } else {
      fields[key] = { stringValue: JSON.stringify(value) };
    }
  }
  
  // Ensure timestamps are set
  if (!fields.createdAt) fields.createdAt = { timestampValue: now };
  if (!fields.updatedAt) fields.updatedAt = { timestampValue: now };
  
  // Use discovered database ID
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`;
  
  // Try POST first (create new document with specific ID)
  const postUrl = `${baseUrl}/locations?documentId=${documentId}`;
  console.log("🌐 REST API Write (POST):", {
    url: postUrl,
    documentId,
    projectId,
    databaseId,
    fieldCount: Object.keys(fields).length,
  });
  
  let response = await fetch(postUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  
  // If POST fails with 404, try PATCH as fallback
  if (!response.ok && response.status === 404) {
    console.warn("⚠️ POST failed with 404, trying PATCH with document ID in path...");
    const patchUrl = `${baseUrl}/locations/${documentId}`;
    console.log("🌐 REST API Write (PATCH fallback):", {
      url: patchUrl,
      documentId,
      projectId,
      databaseId,
    });
    
    response = await fetch(patchUrl, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    });
  }
  
  if (!response.ok) {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      const errorText = await response.text();
      errorData = { error: { message: errorText } };
    }
    
    console.error("❌ REST API Error:", {
      status: response.status,
      statusText: response.statusText,
      error: errorData.error,
      url: response.url,
      databaseId,
      triedPost: true,
      triedPatch: response.status === 404,
    });
    
    // More detailed error message
    const errorMsg = errorData.error?.message || "Unknown error";
    throw new Error(`REST API write failed: ${response.status} ${errorMsg}. URL: ${response.url}. Database ID: ${databaseId}`);
  }
  
  const responseData = await response.json();
  console.log("✅ REST API Write successful:", responseData.name || documentId);
  
  return documentId;
}

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
    
    // CRITICAL: Verify auth and refresh token FIRST, before creating any Firestore references
    // The Firestore SDK may cache connection/auth state when docRef is created
    // So we need fresh auth state BEFORE creating the document reference
    const { auth } = await import("@/lib/firebaseClient");
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("No authenticated user - cannot create location");
    }
    console.log("[repo] createProperty:auth user", {
      uid: currentUser.uid,
      email: currentUser.email,
    });
    
    // CRITICAL: Force token refresh FIRST, before creating docRef
    // The Firestore SDK automatically uses the latest token from auth.currentUser
    // By refreshing before creating docRef, we ensure the SDK uses the fresh token
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
      if (decodeError instanceof Error && decodeError.message.includes("admin role")) {
        throw decodeError; // Re-throw admin role errors
      }
      console.warn("[repo] createProperty:could not decode token (continuing anyway)", decodeError);
    }
    
    // Give Firestore SDK a moment to pick up the refreshed token
    // This ensures any cached connections use the fresh token
    await new Promise(resolve => setTimeout(resolve, 300)); // Increased to 300ms to ensure SDK picks up token
    
    // Verify Firestore connection state before proceeding
    console.log("[repo] createProperty:verifying Firestore connection...", {
      dbAppName: db.app.name,
      dbProjectId: db.app.options.projectId,
      dbType: db.type,
      hasAuth: !!auth.currentUser,
    });
    
    // Ensure Firestore network is enabled (in case it was disabled)
    try {
      const { enableNetwork } = await import("firebase/firestore");
      if (typeof enableNetwork === "function") {
        console.log("[repo] createProperty:ensuring Firestore network is enabled...");
        await enableNetwork(db);
        console.log("[repo] createProperty:Firestore network enabled");
      }
    } catch (networkError) {
      console.warn("[repo] createProperty:could not enable network (may already be enabled)", networkError);
    }
    
    // NOW create document reference AFTER token is refreshed
    // This ensures the docRef is created with fresh auth state
    console.log("[repo] createProperty:generating document ID...");
    const collection = collectionRef();
    const newDocRef = doc(collection);
    const documentId = input.id || newDocRef.id;
    console.log("[repo] createProperty:using document ID", documentId);
    
    // Create docRef AFTER token refresh to ensure Firestore SDK uses fresh token
    const docRef = doc(db, "locations", documentId);
    console.log("[repo] createProperty:calling setDoc with generated ID...", {
      docPath: docRef.path,
      dbInstance: db.app.name,
      dbProject: db.app.options.projectId,
      documentId,
      fullPath: `https://firestore.googleapis.com/v1/projects/${db.app.options.projectId}/databases/(default)/documents/${docRef.path}`,
    });
    
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
        firestoreEndpoint: `https://firestore.googleapis.com/v1/projects/${db.app.options.projectId}/databases/(default)/documents/${docRef.path}`,
      });
      
      // Log that we're about to make the network request
      console.log("[repo] createProperty:INITIATING setDoc network request NOW...");
      console.log("[repo] createProperty:Check Network tab for request to firestore.googleapis.com");
      
      // CRITICAL: Check if Firestore is actually connected before attempting write
      // Firestore uses persistent connections (WebSocket/gRPC-Web) which might not show in Network tab
      // But we can verify the connection state
      try {
        const { waitForPendingWrites, enableNetwork } = await import("firebase/firestore");
        console.log("[repo] createProperty:Checking Firestore connection state...");
        
        // Ensure network is enabled (in case it was disabled)
        await enableNetwork(db);
        console.log("[repo] createProperty:Network explicitly enabled");
        
        // Wait for any pending writes to complete (this verifies connection)
        await waitForPendingWrites(db);
        console.log("[repo] createProperty:Firestore connection verified - pending writes completed");
      } catch (connectionError) {
        console.warn("[repo] createProperty:Firestore connection check failed (continuing anyway):", connectionError);
        // Try to enable network anyway
        try {
          const { enableNetwork } = await import("firebase/firestore");
          await enableNetwork(db);
          console.log("[repo] createProperty:Network enabled after error");
        } catch (enableError) {
          console.error("[repo] createProperty:Failed to enable network:", enableError);
        }
      }
      
      // Log the exact document path that will be written
      console.log("[repo] createProperty:Document to write:", {
        fullPath: docRef.path,
        documentId,
        collection: "locations",
        apiEndpoint: `https://firestore.googleapis.com/v1/projects/${db.app.options.projectId}/databases/(default)/documents/${docRef.path}`,
      });
      
      // Give a moment for network to stabilize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Try setDoc with a timeout - but also add error listener to catch permission errors early
      let timeoutId: NodeJS.Timeout | null = null;
      let hasCompleted = false;
      
      // Add a marker to track when setDoc is actually called
      const setDocCallTime = Date.now();
      console.log(`[repo] createProperty:Calling setDoc at ${setDocCallTime}...`);
      console.log(`[repo] createProperty:setDoc payload:`, {
        hasName: !!payload.name,
        hasPartnerOrgId: !!payload.partnerOrgId,
        hasCreatedBy: !!payload.createdBy,
        keys: Object.keys(payload),
        payloadSize: JSON.stringify(payload).length, // This might fail with serverTimestamp, but that's okay
      });
      
      // CRITICAL: Try to force immediate write by checking if SDK will accept it
      // If setDoc doesn't throw immediately, it should queue the write
      // But if writes aren't being sent, this is where we'll see it
      console.log("[repo] createProperty:About to call setDoc - if this hangs, SDK isn't sending writes");
      
      const setDocPromise = setDoc(docRef, payload, { merge: false })
        .then(() => {
          hasCompleted = true;
          if (timeoutId) clearTimeout(timeoutId);
          const duration = Date.now() - startTime;
          const callToCompleteDuration = Date.now() - setDocCallTime;
          console.log(`[repo] ✅✅✅ createProperty:setDoc SUCCESS in ${duration}ms (call-to-complete: ${callToCompleteDuration}ms)`, documentId);
          return documentId;
        })
        .catch((error) => {
          hasCompleted = true;
          if (timeoutId) clearTimeout(timeoutId);
          const callToErrorDuration = Date.now() - setDocCallTime;
          console.error(`[repo] createProperty:setDoc rejected after ${callToErrorDuration}ms`, error);
          throw error;
        });
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          if (!hasCompleted) {
            const duration = Date.now() - startTime;
            console.error(`[repo] createProperty:setDoc TIMED OUT after ${duration}ms`);
            console.error("[repo] createProperty:This indicates a Firestore connection or rules issue");
            console.error("[repo] createProperty:DIAGNOSTICS:");
            console.error("  1. Open DevTools → Network tab");
            console.error("  2. Filter by 'firestore' or 'googleapis'");
            console.error("  3. Look for requests to firestore.googleapis.com");
            console.error("  4. Check if request was sent (status: pending/sent) or blocked");
            console.error("  5. If no request appears, the SDK isn't sending it (network/SDK issue)");
            console.error("  6. If request appears but hangs, check response status (403 = rules, 401 = auth)");
            console.error(`  7. Expected endpoint: https://firestore.googleapis.com/v1/projects/${db.app.options.projectId}/databases/(default)/documents/${docRef.path}`);
            console.error("[repo] createProperty:⚠️ SDK timed out - will try REST API fallback...");
            // Don't reject yet - let the catch handler try REST API fallback
            reject(new Error(`SDK_TIMEOUT: setDoc timed out after ${duration}ms`));
          }
        }, 10000);
      });
      
      // Try SDK first with timeout
      let result: string;
      try {
        result = await Promise.race([setDocPromise, timeoutPromise]);
      } catch (setDocError) {
        const duration = Date.now() - startTime;
        const firestoreError = setDocError as any;
        const errorMsg = setDocError instanceof Error ? setDocError.message : String(setDocError);
        
        console.error(`[repo] createProperty:setDoc failed after ${duration}ms`, {
          error: setDocError,
          errorCode: firestoreError?.code,
          errorMessage: errorMsg,
          firestoreCode: firestoreError?.code,
          firestoreMessage: firestoreError?.message,
          isPermissionError: firestoreError?.code === 'permission-denied' || firestoreError?.code === 7,
          isTimeout: errorMsg.includes("SDK_TIMEOUT") || errorMsg.includes("timed out"),
          documentId,
          payload: {
            name: payload.name,
            partnerOrgId: payload.partnerOrgId,
            createdBy: payload.createdBy,
          },
        });
        
        // If SDK timed out, try REST API fallback
        if (errorMsg.includes("SDK_TIMEOUT") || errorMsg.includes("timed out")) {
          console.warn("=".repeat(80));
          console.warn("[repo] ⚠️⚠️⚠️ SDK timed out, using REST API fallback... ⚠️⚠️⚠️");
          console.warn("=".repeat(80));
          console.warn("[repo] createProperty:Error message:", errorMsg);
          console.warn("[repo] createProperty:Checking if errorMsg includes 'SDK_TIMEOUT':", errorMsg.includes("SDK_TIMEOUT"));
          console.warn("[repo] createProperty:Checking if errorMsg includes 'timed out':", errorMsg.includes("timed out"));
          
          try {
            console.warn("[repo] createProperty:About to call writePropertyViaRestApi...");
            result = await writePropertyViaRestApi(docRef, payload, documentId);
            console.log("=".repeat(80));
            console.log("[repo] ✅✅✅ REST API fallback SUCCEEDED! ✅✅✅");
            console.log("=".repeat(80));
          } catch (restError) {
            console.error("=".repeat(80));
            console.error("[repo] ❌❌❌ REST API fallback FAILED! ❌❌❌");
            console.error("=".repeat(80));
            console.error("[repo] createProperty:REST API fallback error:", restError);
            console.error("[repo] createProperty:REST API error details:", {
              error: restError,
              errorMessage: restError instanceof Error ? restError.message : String(restError),
              errorStack: restError instanceof Error ? restError.stack : undefined,
            });
            throw new Error(`Both SDK and REST API failed. SDK: ${errorMsg}. REST: ${restError instanceof Error ? restError.message : String(restError)}`);
          }
        } else if (firestoreError?.code === 'permission-denied' || firestoreError?.code === 7) {
          throw new Error(`Firestore permission denied. Check: 1) Rules are published, 2) Token has admin role, 3) Rules allow create on /locations. Original: ${firestoreError?.message || String(setDocError)}`);
        } else {
          throw setDocError;
        }
      }
      
      return result;
    } catch (error) {
      // This catch is for the inner try block that starts at line 257
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
  } catch (error) {
    // This catch is for the outer try block that starts at line 147
    console.error("[repo] createProperty:outer error", {
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
