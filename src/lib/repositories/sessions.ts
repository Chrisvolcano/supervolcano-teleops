/**
 * Sessions Repository
 * Automatic date-based session tracking (one session per location per calendar day)
 */

import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export interface Session {
  id?: string;
  organizationId: string;
  organizationName: string;
  teleoperatorId: string;
  teleoperatorName: string;
  locationId: string;
  locationName: string;
  // Session = 24-hour period at one location
  date: string; // YYYY-MM-DD format (e.g., "2024-01-15")
  taskCompletionIds: string[];
  totalTasks: number;
  totalDuration: number; // sum of all task durations in minutes
  firstTaskStartedAt?: Timestamp | Date;
  lastTaskCompletedAt?: Timestamp | Date;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

/**
 * Get or create session for location on specific date
 * Auto-creates if doesn't exist
 */
export async function getOrCreateSessionForDate(
  organizationId: string,
  organizationName: string,
  teleoperatorId: string,
  teleoperatorName: string,
  locationId: string,
  locationName: string,
  date: string, // YYYY-MM-DD
) {
  try {
    // Try to find existing session for this location + date + teleoperator
    let existingSnapshot;
    try {
      existingSnapshot = await adminDb
        .collection("sessions")
        .where("teleoperatorId", "==", teleoperatorId)
        .where("locationId", "==", locationId)
        .where("date", "==", date)
        .limit(1)
        .get();
    } catch (error: any) {
      // If index doesn't exist, query without date filter
      console.warn("[sessions] Query failed, trying without date filter:", error.message);
      existingSnapshot = await adminDb
        .collection("sessions")
        .where("teleoperatorId", "==", teleoperatorId)
        .where("locationId", "==", locationId)
        .limit(1)
        .get();
      
      // Filter in memory
      const docs = existingSnapshot.docs.filter(doc => doc.data().date === date);
      if (docs.length > 0) {
        const doc = docs[0];
        return { success: true, session: { id: doc.id, ...doc.data() }, created: false };
      }
    }

    if (!existingSnapshot.empty) {
      const doc = existingSnapshot.docs[0];
      const data = doc.data();
      return {
        success: true,
        session: { id: doc.id, ...data, firstTaskStartedAt: data.firstTaskStartedAt, lastTaskCompletedAt: data.lastTaskCompletedAt },
        created: false,
      };
    }

    // Create new session
    const sessionRef = adminDb.collection("sessions").doc();
    const now = Timestamp.now();

    const session = {
      organizationId,
      organizationName,
      teleoperatorId,
      teleoperatorName,
      locationId,
      locationName,
      date,
      taskCompletionIds: [],
      totalTasks: 0,
      totalDuration: 0,
      createdAt: now,
      updatedAt: now,
    };

    await sessionRef.set(session);

    return {
      success: true,
      session: { id: sessionRef.id, ...session },
      created: true,
    };
  } catch (error: any) {
    console.error("Failed to get/create session:", error);
    return { success: false, error: error.message || "Failed to manage session" };
  }
}

/**
 * Add task completion to session
 */
export async function addCompletionToSession(
  sessionId: string,
  completionId: string,
  taskDuration: number,
  taskStartedAt: Date,
  taskCompletedAt: Date,
) {
  try {
    const sessionRef = adminDb.collection("sessions").doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return { success: false, error: "Session not found" };
    }

    const session = sessionDoc.data();
    const taskStartedTimestamp = Timestamp.fromDate(taskStartedAt);
    const taskCompletedTimestamp = Timestamp.fromDate(taskCompletedAt);

    const updateData: any = {
      taskCompletionIds: FieldValue.arrayUnion(completionId),
      totalTasks: FieldValue.increment(1),
      totalDuration: FieldValue.increment(taskDuration),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Update first/last timestamps
    if (!session?.firstTaskStartedAt || taskStartedTimestamp.toMillis() < (session.firstTaskStartedAt as Timestamp).toMillis()) {
      updateData.firstTaskStartedAt = taskStartedTimestamp;
    }

    if (!session?.lastTaskCompletedAt || taskCompletedTimestamp.toMillis() > (session.lastTaskCompletedAt as Timestamp).toMillis()) {
      updateData.lastTaskCompletedAt = taskCompletedTimestamp;
    }

    await sessionRef.update(updateData);

    return { success: true };
  } catch (error: any) {
    console.error("Failed to add completion to session:", error);
    return { success: false, error: error.message || "Failed to update session" };
  }
}

/**
 * Get today's session for teleoperator at location (if exists)
 */
export async function getTodaySessionAtLocation(teleoperatorId: string, locationId: string) {
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    let snapshot;
    try {
      snapshot = await adminDb
        .collection("sessions")
        .where("teleoperatorId", "==", teleoperatorId)
        .where("locationId", "==", locationId)
        .where("date", "==", today)
        .limit(1)
        .get();
    } catch (error: any) {
      // If index doesn't exist, query without date filter and filter in memory
      console.warn("[sessions] Query failed, trying without date filter:", error.message);
      snapshot = await adminDb
        .collection("sessions")
        .where("teleoperatorId", "==", teleoperatorId)
        .where("locationId", "==", locationId)
        .limit(10)
        .get();
      
      // Filter in memory
      const docs = snapshot.docs.filter(doc => doc.data().date === today);
      if (docs.length > 0) {
        const doc = docs[0];
        const data = doc.data();
        return {
          success: true,
          session: {
            id: doc.id,
            ...data,
            firstTaskStartedAt: data.firstTaskStartedAt,
            lastTaskCompletedAt: data.lastTaskCompletedAt,
          },
        };
      }
      return { success: true, session: null };
    }

    if (snapshot.empty) {
      return { success: true, session: null };
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      success: true,
      session: {
        id: doc.id,
        ...data,
        firstTaskStartedAt: data.firstTaskStartedAt,
        lastTaskCompletedAt: data.lastTaskCompletedAt,
      },
    };
  } catch (error: any) {
    console.error("Failed to get today session:", error);
    return { success: false, error: error.message || "Failed to get session" };
  }
}

/**
 * Get sessions with filters
 */
export async function getSessions(filters: {
  organizationId?: string;
  teleoperatorId?: string;
  locationId?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  limit?: number;
}) {
  try {
    let query: FirebaseFirestore.Query = adminDb.collection("sessions");

    if (filters.organizationId) {
      query = query.where("organizationId", "==", filters.organizationId);
    }

    if (filters.teleoperatorId) {
      query = query.where("teleoperatorId", "==", filters.teleoperatorId);
    }

    if (filters.locationId) {
      query = query.where("locationId", "==", filters.locationId);
    }

    if (filters.startDate) {
      query = query.where("date", ">=", filters.startDate);
    }

    if (filters.endDate) {
      query = query.where("date", "<=", filters.endDate);
    }

    // Try to order by date, but fall back if index doesn't exist
    let snapshot;
    try {
      query = query.orderBy("date", "desc");
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      snapshot = await query.get();
    } catch (error: any) {
      // If orderBy fails, rebuild query without it
      console.warn("[sessions] OrderBy failed, querying without it:", error.message);
      // Rebuild query from scratch without orderBy
      let fallbackQuery: FirebaseFirestore.Query = adminDb.collection("sessions");

      if (filters.organizationId) {
        fallbackQuery = fallbackQuery.where("organizationId", "==", filters.organizationId);
      }

      if (filters.teleoperatorId) {
        fallbackQuery = fallbackQuery.where("teleoperatorId", "==", filters.teleoperatorId);
      }

      if (filters.locationId) {
        fallbackQuery = fallbackQuery.where("locationId", "==", filters.locationId);
      }

      if (filters.startDate) {
        fallbackQuery = fallbackQuery.where("date", ">=", filters.startDate);
      }

      if (filters.endDate) {
        fallbackQuery = fallbackQuery.where("date", "<=", filters.endDate);
      }

      if (filters.limit) {
        fallbackQuery = fallbackQuery.limit(filters.limit * 2); // Get more to sort in memory
      }

      snapshot = await fallbackQuery.get();
    }

    let sessions = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        date: data.date as string,
        locationId: data.locationId as string,
        locationName: data.locationName as string,
        totalTasks: (data.totalTasks as number) || 0,
        totalDuration: (data.totalDuration as number) || 0,
        ...data,
        firstTaskStartedAt: data.firstTaskStartedAt,
        lastTaskCompletedAt: data.lastTaskCompletedAt,
      };
    });

    // Sort in memory if we couldn't use orderBy
    sessions.sort((a, b) => {
      const aDate = a.date || "";
      const bDate = b.date || "";
      return bDate.localeCompare(aDate); // Descending order
    });

    // Apply limit after sorting if needed
    if (filters.limit) {
      sessions = sessions.slice(0, filters.limit);
    }

    return { success: true, sessions };
  } catch (error: any) {
    console.error("Failed to get sessions:", error);
    return { success: false, error: error.message || "Failed to load sessions" };
  }
}
