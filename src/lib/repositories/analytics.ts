/**
 * Analytics Repository
 * Provides dashboard data and metrics for organizations
 */

import { adminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import type { TaskCompletion } from "@/lib/types";

const COMPLETIONS_COLLECTION = "taskCompletions";

/**
 * Get comprehensive dashboard data for an organization
 */
export async function getOrganizationDashboardData(organizationId: string) {
  try {
    console.log("[analytics] getOrganizationDashboardData - Starting for org:", organizationId);

    // Get teleoperators
    const teleopSnapshot = await adminDb
      .collection("teleoperators")
      .where("organizationId", "==", organizationId)
      .get();

    const teleoperators = teleopSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email as string,
        displayName: data.displayName as string,
        currentStatus: data.currentStatus as string,
        ...data,
      };
    });

    console.log("[analytics] Found", teleoperators.length, "teleoperators");

    // Get locations
    const locationsSnapshot = await adminDb
      .collection("locations")
      .where("assignedOrganizationId", "==", organizationId)
      .where("status", "==", "active")
      .get();

    const locations = [];
    for (const locDoc of locationsSnapshot.docs) {
      const locData = locDoc.data();
      const tasksSnapshot = await locDoc.ref.collection("tasks").where("status", "==", "active").get();

      locations.push({
        id: locDoc.id,
        name: locData.name || "Unnamed Location",
        address: locData.address || "",
        taskCount: tasksSnapshot.size,
        completions: 0, // Will be calculated below
      });
    }

    console.log("[analytics] Found", locations.length, "locations");

    // Get task completions (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoTimestamp = Timestamp.fromDate(ninetyDaysAgo);

    let completionsSnapshot;
    try {
      completionsSnapshot = await adminDb
        .collection(COMPLETIONS_COLLECTION)
        .where("organizationId", "==", organizationId)
        .where("completedAt", ">=", ninetyDaysAgoTimestamp)
        .orderBy("completedAt", "desc")
        .get();
    } catch (error: any) {
      // If index doesn't exist, query without orderBy
      console.warn("[analytics] OrderBy failed, querying without it:", error.message);
      completionsSnapshot = await adminDb
        .collection(COMPLETIONS_COLLECTION)
        .where("organizationId", "==", organizationId)
        .get();
    }

    const completions: TaskCompletion[] = completionsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        taskId: data.taskId || "",
        locationId: data.locationId || "",
        organizationId: data.organizationId || "",
        teleoperatorId: data.teleoperatorId || "",
        teleoperatorName: data.teleoperatorName || "Unknown",
        taskTitle: data.taskTitle || "Untitled Task",
        taskCategory: data.taskCategory,
        estimatedDuration: data.estimatedDuration,
        locationName: data.locationName || "Unknown Location",
        startedAt: data.startedAt,
        completedAt: data.completedAt,
        actualDuration: data.actualDuration || 0,
        status: data.status || "completed",
        notes: data.notes,
        issuesEncountered: data.issuesEncountered,
        createdAt: data.createdAt || data.completedAt,
      };
    });

    // Get sessions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoTimestamp = Timestamp.fromDate(thirtyDaysAgo);

    let sessionsSnapshot;
    try {
      sessionsSnapshot = await adminDb
        .collection("sessions")
        .where("organizationId", "==", organizationId)
        .where("startedAt", ">=", thirtyDaysAgoTimestamp)
        .orderBy("startedAt", "desc")
        .get();
    } catch (error: any) {
      // If index doesn't exist, query without orderBy
      console.warn("[analytics] Sessions orderBy failed, querying without it:", error.message);
      sessionsSnapshot = await adminDb
        .collection("sessions")
        .where("organizationId", "==", organizationId)
        .get();
    }

    const sessions = sessionsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        locationId: data.locationId as string,
        locationName: data.locationName as string,
        totalTasks: (data.totalTasks as number) || 0,
        totalDuration: (data.totalDuration as number) || 0,
        startedAt: data.startedAt,
        endedAt: data.endedAt,
      };
    });

    // Sessions today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);
    const todaySessions = sessions.filter((s) => {
      const startDate = s.startedAt?.toDate ? s.startedAt.toDate() : new Date(s.startedAt);
      return startDate >= today;
    }).length;

    // Sessions by location
    const sessionsByLocationMap: Record<
      string,
      {
        locationId: string;
        locationName: string;
        sessions: number;
        totalTasks: number;
        totalDuration: number;
      }
    > = {};

    sessions.forEach((session) => {
      if (!sessionsByLocationMap[session.locationId]) {
        sessionsByLocationMap[session.locationId] = {
          locationId: session.locationId,
          locationName: session.locationName,
          sessions: 0,
          totalTasks: 0,
          totalDuration: 0,
        };
      }
      sessionsByLocationMap[session.locationId].sessions++;
      sessionsByLocationMap[session.locationId].totalTasks += session.totalTasks || 0;
      sessionsByLocationMap[session.locationId].totalDuration += session.totalDuration || 0;
    });

    const sessionsByLocation = Object.values(sessionsByLocationMap).map((item) => ({
      ...item,
      avgDuration: item.sessions > 0 ? Math.round(item.totalDuration / item.sessions) : 0,
    }));

    // Sort completions by completedAt (descending) if not already sorted
    completions.sort((a, b) => {
      const aTime = a.completedAt && typeof a.completedAt === "object" && "toMillis" in a.completedAt
        ? a.completedAt.toMillis()
        : typeof a.completedAt === "number"
          ? a.completedAt
          : new Date(a.completedAt as string).getTime();
      const bTime = b.completedAt && typeof b.completedAt === "object" && "toMillis" in b.completedAt
        ? b.completedAt.toMillis()
        : typeof b.completedAt === "number"
          ? b.completedAt
          : new Date(b.completedAt as string).getTime();
      return bTime - aTime;
    });

    console.log("[analytics] Found", completions.length, "completions");

    // Calculate metrics
    const totalCompletions = completions.length;
    const avgDuration =
      completions.length > 0
        ? completions.reduce((sum, c) => sum + (c.actualDuration || 0), 0) / completions.length
        : 0;

    // Top performers (last 30 days) - reuse the thirtyDaysAgo from sessions query
    const recentCompletions = completions.filter((c) => {
      const completedTime =
        c.completedAt && typeof c.completedAt === "object" && "toMillis" in c.completedAt
          ? c.completedAt.toMillis()
          : typeof c.completedAt === "number"
            ? c.completedAt
            : new Date(c.completedAt as string).getTime();
      return completedTime >= thirtyDaysAgo.getTime();
    });

    const performerStats: Record<
      string,
      {
        id: string;
        name: string;
        email: string;
        completions: number;
        totalDuration: number;
      }
    > = {};

    recentCompletions.forEach((c) => {
      if (!performerStats[c.teleoperatorId]) {
        const teleop = teleoperators.find((t) => t.id === c.teleoperatorId);
        performerStats[c.teleoperatorId] = {
          id: c.teleoperatorId,
          name: c.teleoperatorName,
          email: teleop?.email || "",
          completions: 0,
          totalDuration: 0,
        };
      }
      performerStats[c.teleoperatorId].completions++;
      performerStats[c.teleoperatorId].totalDuration += c.actualDuration || 0;
    });

    const topPerformers = Object.values(performerStats)
      .sort((a, b) => b.completions - a.completions)
      .slice(0, 5);

    // Enrich teleoperator data with completions
    const enrichedTeleoperators = teleoperators.map((teleop) => {
      const teleopCompletions = completions.filter((c) => c.teleoperatorId === teleop.id);
      const completed = teleopCompletions.filter((c) => c.status === "completed");

      return {
        ...teleop,
        displayName: (teleop.displayName as string) || (teleop.email as string)?.split("@")[0] || "Unknown",
        status: teleop.currentStatus || "offline",
        completions: teleopCompletions,
        avgDuration:
          teleopCompletions.length > 0
            ? teleopCompletions.reduce((sum, c) => sum + (c.actualDuration || 0), 0) /
              teleopCompletions.length
            : 0,
        successRate:
          teleopCompletions.length > 0 ? (completed.length / teleopCompletions.length) * 100 : 0,
      };
    });

    // Calculate location completion counts
    const locationCompletions: Record<string, number> = {};
    completions.forEach((c) => {
      locationCompletions[c.locationId] = (locationCompletions[c.locationId] || 0) + 1;
    });

    const enrichedLocations = locations.map((loc) => ({
      ...loc,
      completions: locationCompletions[loc.id] || 0,
    }));

    return {
      success: true,
      data: {
        teleoperators: enrichedTeleoperators,
        locations: enrichedLocations,
        totalCompletions,
        avgDuration,
        topPerformers,
        recentCompletions: completions.slice(0, 50), // Most recent 50
        todaySessions,
        sessionsByLocation,
        totalSessions: sessions.length,
      },
    };
  } catch (error: any) {
    console.error("[analytics] getOrganizationDashboardData - Error:", error);
    return {
      success: false,
      error: error.message || "Failed to load dashboard data",
      data: {
        teleoperators: [],
        locations: [],
        totalCompletions: 0,
        avgDuration: 0,
        topPerformers: [],
        recentCompletions: [],
      },
    };
  }
}

