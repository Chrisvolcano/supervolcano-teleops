'use server'

import { adminDb } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';

export interface AdminDashboardData {
  // Overview metrics
  totalOrganizations: number;
  totalLocations: number;
  totalTasks: number;
  totalTeleoperators: number;
  
  // Activity metrics (last 30 days)
  totalCompletions: number;
  totalSessions: number;
  totalWorkMinutes: number;
  avgCompletionsPerDay: number;
  
  // Today's activity
  completionsToday: number;
  sessionsToday: number;
  activeSessionsNow: number;
  
  // Top performers (last 30 days)
  topOrganizations: Array<{
    id: string;
    name: string;
    completions: number;
    sessions: number;
  }>;
  
  topTeleoperators: Array<{
    id: string;
    name: string;
    organizationName: string;
    completions: number;
    avgDuration: number;
  }>;
  
  topLocations: Array<{
    id: string;
    name: string;
    address: string;
    organizationName: string;
    completions: number;
  }>;
  
  // Recent activity
  recentCompletions: Array<{
    id: string;
    taskTitle: string;
    locationName: string;
    teleoperatorName: string;
    organizationName: string;
    completedAt: admin.firestore.Timestamp;
    status: string;
    duration: number;
  }>;
  
  recentSessions: Array<{
    id: string;
    locationName: string;
    teleoperatorName: string;
    organizationName: string;
    date: string;
    totalTasks: number;
    totalDuration: number;
  }>;
  
  // Problem areas
  locationsWithoutTasks: Array<{
    id: string;
    name: string;
    organizationName: string;
  }>;
  
  organizationsWithoutActivity: Array<{
    id: string;
    name: string;
    locationCount: number;
    lastActivity?: admin.firestore.Timestamp;
  }>;
}

export async function getAdminDashboardData(): Promise<{
  success: boolean;
  data?: AdminDashboardData;
  error?: string;
}> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];
    
    // Fetch all collections
    const [orgsSnap, locationsSnap, tasksSnap, teleopSnap, completionsSnap, sessionsSnap] = await Promise.all([
      adminDb.collection('organizations').get(),
      adminDb.collection('locations').get(),
      adminDb.collection('locations').get().then(async (snap) => {
        // Get all tasks from all locations
        const allTasks: any[] = [];
        for (const locDoc of snap.docs) {
          const tasksSubcollection = await locDoc.ref.collection('tasks').get();
          tasksSubcollection.docs.forEach(taskDoc => {
            allTasks.push({ id: taskDoc.id, locationId: locDoc.id, ...taskDoc.data() });
          });
        }
        return allTasks;
      }),
      adminDb.collection('users').where('role', '==', 'oem_teleoperator').get(),
      adminDb.collection('taskCompletions')
        .where('completedAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
        .get(),
      adminDb.collection('sessions')
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
        .get(),
    ]);
    
    const organizations = orgsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    const locations = locationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    const tasks = tasksSnap as any[];
    const teleoperators = teleopSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    const completions = completionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    const sessions = sessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    
    // Calculate metrics
    const totalOrganizations = organizations.length;
    const totalLocations = locations.length;
    const totalTasks = tasks.length;
    const totalTeleoperators = teleoperators.length;
    
    const totalCompletions = completions.length;
    const totalSessions = sessions.length;
    const totalWorkMinutes = completions.reduce((sum, c) => sum + (c.actualDuration || 0), 0);
    const avgCompletionsPerDay = Math.round(totalCompletions / 30);
    
    // Today's activity
    const completionsToday = completions.filter(c => {
      const completedAt = c.completedAt?.toDate ? c.completedAt.toDate() : new Date(c.completedAt);
      return completedAt >= today;
    }).length;
    
    const sessionsToday = sessions.filter(s => 
      s.date === todayString
    ).length;
    
    // Active sessions (sessions created in last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeSessionsNow = sessions.filter(s => {
      const createdAt = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
      return createdAt >= oneDayAgo;
    }).length;
    
    // Top organizations
    const orgCompletions: Record<string, { name: string; completions: number; sessions: number }> = {};
    completions.forEach(c => {
      if (c.organizationId && !orgCompletions[c.organizationId]) {
        orgCompletions[c.organizationId] = {
          name: c.organizationName || 'Unknown',
          completions: 0,
          sessions: 0,
        };
      }
      if (c.organizationId) {
        orgCompletions[c.organizationId].completions++;
      }
    });
    sessions.forEach(s => {
      if (s.organizationId && orgCompletions[s.organizationId]) {
        orgCompletions[s.organizationId].sessions++;
      }
    });
    
    const topOrganizations = Object.entries(orgCompletions)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.completions - a.completions)
      .slice(0, 5);
    
    // Top teleoperators
    const teleopStats: Record<string, { 
      name: string; 
      orgName: string; 
      completions: number; 
      totalDuration: number 
    }> = {};
    
    completions.forEach(c => {
      if (c.teleoperatorId && !teleopStats[c.teleoperatorId]) {
        teleopStats[c.teleoperatorId] = {
          name: c.teleoperatorName || 'Unknown',
          orgName: c.organizationName || 'Unknown',
          completions: 0,
          totalDuration: 0,
        };
      }
      if (c.teleoperatorId) {
        teleopStats[c.teleoperatorId].completions++;
        teleopStats[c.teleoperatorId].totalDuration += c.actualDuration || 0;
      }
    });
    
    const topTeleoperators = Object.entries(teleopStats)
      .map(([id, data]) => ({
        id,
        name: data.name,
        organizationName: data.orgName,
        completions: data.completions,
        avgDuration: data.completions > 0 ? Math.round(data.totalDuration / data.completions) : 0,
      }))
      .sort((a, b) => b.completions - a.completions)
      .slice(0, 5);
    
    // Top locations
    const locationStats: Record<string, { 
      name: string; 
      address: string;
      orgName: string; 
      completions: number 
    }> = {};
    
    completions.forEach(c => {
      if (c.locationId && !locationStats[c.locationId]) {
        const location = locations.find(l => l.id === c.locationId);
        locationStats[c.locationId] = {
          name: c.locationName || 'Unknown',
          address: location?.address || '',
          orgName: c.organizationName || 'Unknown',
          completions: 0,
        };
      }
      if (c.locationId) {
        locationStats[c.locationId].completions++;
      }
    });
    
    const topLocations = Object.entries(locationStats)
      .map(([id, data]) => ({ 
        id, 
        name: data.name,
        address: data.address,
        organizationName: data.orgName,
        completions: data.completions,
      }))
      .sort((a, b) => b.completions - a.completions)
      .slice(0, 5);
    
    // Recent completions
    const recentCompletions = completions
      .map(c => {
        const completedAt = c.completedAt?.toDate ? c.completedAt.toDate() : new Date(c.completedAt);
        return {
          ...c,
          completedAtTimestamp: completedAt.getTime(),
          completedAtObj: c.completedAt,
        };
      })
      .sort((a, b) => b.completedAtTimestamp - a.completedAtTimestamp)
      .slice(0, 10)
      .map(c => ({
        id: c.id,
        taskTitle: c.taskTitle || 'Unknown Task',
        locationName: c.locationName || 'Unknown Location',
        teleoperatorName: c.teleoperatorName || 'Unknown',
        organizationName: c.organizationName || 'Unknown',
        completedAt: c.completedAtObj as admin.firestore.Timestamp,
        status: c.status || 'completed',
        duration: c.actualDuration || 0,
      }));
    
    // Recent sessions
    const recentSessions = sessions
      .map(s => {
        const createdAt = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
        return {
          ...s,
          createdAtTimestamp: createdAt.getTime(),
        };
      })
      .sort((a, b) => b.createdAtTimestamp - a.createdAtTimestamp)
      .slice(0, 10)
      .map(s => ({
        id: s.id,
        locationName: s.locationName || 'Unknown Location',
        teleoperatorName: s.teleoperatorName || 'Unknown',
        organizationName: s.organizationName || 'Unknown',
        date: s.date || '',
        totalTasks: s.totalTasks || 0,
        totalDuration: s.totalDuration || 0,
      }));
    
    // Problem areas - locations without tasks
    const locationsWithoutTasks = locations
      .filter(loc => {
        const hasTasks = tasks.some(t => t.locationId === loc.id);
        return !hasTasks;
      })
      .map(loc => {
        const org = organizations.find(o => o.id === loc.assignedOrganizationId);
        return {
          id: loc.id,
          name: loc.name || 'Unnamed Location',
          organizationName: org?.name || 'Unassigned',
        };
      })
      .slice(0, 5);
    
    // Organizations without recent activity
    const organizationsWithoutActivity = organizations
      .map(org => {
        const orgCompletions = completions.filter(c => c.organizationId === org.id);
        const lastCompletion = orgCompletions.length > 0
          ? orgCompletions.map(c => {
              const completedAt = c.completedAt?.toDate ? c.completedAt.toDate() : new Date(c.completedAt);
              return { ...c, completedAtTimestamp: completedAt.getTime() };
            }).sort((a, b) => b.completedAtTimestamp - a.completedAtTimestamp)[0]
          : null;
        
        const orgLocations = locations.filter(l => l.assignedOrganizationId === org.id);
        
        return {
          id: org.id,
          name: org.name || 'Unnamed Organization',
          locationCount: orgLocations.length,
          lastActivity: lastCompletion?.completedAt as admin.firestore.Timestamp | undefined,
          hasNoActivity: !lastCompletion,
        };
      })
      .filter(org => org.hasNoActivity || !org.lastActivity)
      .slice(0, 5);
    
    return {
      success: true,
      data: {
        totalOrganizations,
        totalLocations,
        totalTasks,
        totalTeleoperators,
        totalCompletions,
        totalSessions,
        totalWorkMinutes,
        avgCompletionsPerDay,
        completionsToday,
        sessionsToday,
        activeSessionsNow,
        topOrganizations,
        topTeleoperators,
        topLocations,
        recentCompletions,
        recentSessions,
        locationsWithoutTasks,
        organizationsWithoutActivity,
      },
    };
    
  } catch (error) {
    console.error('Failed to load admin dashboard data:', error);
    return { success: false, error: 'Failed to load dashboard data' };
  }
}

