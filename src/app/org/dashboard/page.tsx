"use client";

/**
 * Organization Dashboard Page
 * Simplified with automatic session tracking
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/SkeletonCard";
import toast from "react-hot-toast";

type MetricCardProps = {
  title: string;
  value: string | number;
  icon: string;
  color: "blue" | "purple" | "green" | "orange";
  onClick?: () => void;
};

function MetricCard({ title, value, icon, color, onClick }: MetricCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <Card
      className={onClick ? "cursor-pointer hover:shadow-lg transition-shadow" : ""}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      } : undefined}
      aria-label={onClick ? `${title}: ${value}. Click to view details.` : `${title}: ${value}`}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <div className={`text-3xl p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
          <div>
            <div className="text-2xl font-semibold text-slate-900">{value}</div>
            <div className="text-sm text-slate-600">{title}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type LocationCardProps = {
  location: {
    id: string;
    name: string;
    address: string;
    taskCount?: number;
    completions?: number;
  };
};

function LocationCard({ location }: LocationCardProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/org/locations/${location.id}`)}
      className="border rounded-lg p-4 cursor-pointer hover:shadow-md transition"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          router.push(`/org/locations/${location.id}`);
        }
      }}
      aria-label={`View location ${location.name}`}
    >
      <h4 className="font-semibold mb-1">{location.name}</h4>
      <p className="text-sm text-gray-600 mb-3">{location.address}</p>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-600">{location.taskCount || 0} tasks</span>
        <span className="text-green-600">{location.completions || 0} completed</span>
      </div>
    </div>
  );
}

function SessionCard({ session }: { session: any }) {
  const router = useRouter();
  
  return (
    <div 
      className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
      onClick={() => router.push(`/org/locations/${session.locationId}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          router.push(`/org/locations/${session.locationId}`);
        }
      }}
      aria-label={`View session at ${session.locationName}`}
    >
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold">{session.locationName}</span>
        </div>
        <p className="text-sm text-gray-600">
          {session.date} • {session.totalTasks} tasks
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold">{session.totalDuration} min</p>
        <p className="text-sm text-gray-600">total time</p>
      </div>
    </div>
  );
}

// MANAGER VIEW: Full analytics
function ManagerDashboard({
  data,
  user,
  router,
}: {
  data: any;
  user: { displayName?: string; organizationName?: string };
  router: any;
}) {
  if (!data) {
    return <LoadingSpinner message="Loading dashboard data..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">Organization Dashboard</h1>
        <p className="text-sm text-slate-600">{user.organizationName}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <MetricCard
          title="Locations"
          value={data.locations?.length || 0}
          icon="📍"
          color="blue"
          onClick={() => router.push("/org/locations")}
        />
        <MetricCard
          title="Team Members"
          value={data.teleoperators?.length || 0}
          icon="👥"
          color="purple"
          onClick={() => router.push("/org/team")}
        />
        <MetricCard
          title="Tasks Completed"
          value={data.totalCompletions || 0}
          icon="✅"
          color="green"
          onClick={() => router.push("/org/tasks")}
        />
        <MetricCard
          title="Sessions Today"
          value={data.todaySessions || 0}
          icon="🚀"
          color="purple"
        />
      </div>

      {/* Sessions by Location */}
      {data.sessionsByLocation && data.sessionsByLocation.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">🚀 Sessions by Location</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {data.sessionsByLocation.map((item: any) => (
                <div key={item.locationId} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">{item.locationName}</span>
                    <p className="text-sm text-gray-600">
                      {item.sessions} sessions • {item.totalTasks} tasks
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Avg {item.avgDuration} min/session</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="p-6">
            <EmptyState
              icon="🚀"
              title="No Sessions Yet"
              description="Once your team starts completing tasks, you'll see session analytics here."
            />
          </div>
        </div>
      )}

      {/* Top Performers */}
      {data.topPerformers && data.topPerformers.length > 0 ? (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">🏆 Top Performers</h3>
            <div className="space-y-3">
              {data.topPerformers.map((teleop: any, index: number) => (
                <div key={teleop.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                    <span className="font-medium">{teleop.name}</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">{teleop.completions}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon="🏆"
              title="No Top Performers Yet"
              description="Performance rankings will appear here once team members complete tasks."
            />
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {data.recentCompletions && data.recentCompletions.length > 0 ? (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">📈 Recent Activity</h3>
            <div className="space-y-2">
              {data.recentCompletions.slice(0, 10).map((completion: any) => (
                <div key={completion.id} className="flex justify-between p-3 hover:bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">{completion.teleoperatorName}</span>
                    <span className="text-gray-600"> completed </span>
                    <span className="font-medium">{completion.taskTitle}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(completion.completedAt?.toDate ? completion.completedAt.toDate() : completion.completedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon="📈"
              title="No Activity Yet"
              description="Your team hasn't completed any tasks yet. Once they start, you'll see recent activity here."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// TELEOPERATOR VIEW: Task-focused
function TeleoperatorDashboard({
  user,
  router,
  recentSessions,
  locations,
  data,
}: {
  user: { displayName?: string; organizationName?: string; teleoperatorId?: string };
  router: any;
  recentSessions?: any[];
  locations?: any[];
  data?: any;
}) {
  // Calculate stats from sessions (memoized)
  const { totalTasks, totalDuration, avgDuration } = useMemo(() => {
    const tasks = recentSessions?.reduce((sum, s) => sum + (s.totalTasks || 0), 0) || 0;
    const duration = recentSessions?.reduce((sum, s) => sum + (s.totalDuration || 0), 0) || 0;
    const avg = tasks > 0 ? Math.round(duration / tasks) : 0;
    return { totalTasks: tasks, totalDuration: duration, avgDuration: avg };
  }, [recentSessions]);

  // Filter to show only this teleoperator's completions (memoized)
  const myCompletions = useMemo(() => {
    return (data?.recentCompletions || []).filter(
      (c: any) => c.teleoperatorId === user.teleoperatorId,
    );
  }, [data?.recentCompletions, user.teleoperatorId]);

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user.displayName}!</h1>
        <p className="text-gray-600">{user.organizationName}</p>
      </div>

      {/* My Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <MetricCard
          title="Tasks Completed"
          value={totalTasks}
          icon="✅"
          color="green"
          onClick={() => router.push("/org/tasks")}
        />
        <MetricCard
          title="Avg Duration"
          value={`${avgDuration} min`}
          icon="⏱️"
          color="blue"
        />
        <MetricCard
          title="Recent Sessions"
          value={recentSessions?.length || 0}
          icon="🚀"
          color="purple"
        />
      </div>

      {/* Quick Access to Locations */}
      {(locations || []).length > 0 ? (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">📍 Your Locations ({(locations || []).length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(locations || []).map((location: any) => (
                <LocationCard key={location.id} location={location} />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon="📍"
              title="No Locations Assigned"
              description="You don't have any locations assigned yet. Contact your manager to get started."
            />
          </CardContent>
        </Card>
      )}

      {/* Recent Sessions */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold mb-4">📊 Recent Sessions</h3>
          {(!recentSessions || recentSessions.length === 0) ? (
            <EmptyState
              icon="🎯"
              title="No Tasks Completed Yet"
              description="Complete your first task to start tracking your performance and building your stats!"
              action={{
                label: "View Locations",
                onClick: () => router.push("/org/locations")
              }}
            />
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session: any) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Recent Tasks */}
      {myCompletions.length > 0 ? (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">📋 My Recent Tasks</h3>
            <div className="space-y-2">
              {myCompletions.slice(0, 10).map((completion: any) => (
                <div key={completion.id} className="flex justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">{completion.taskTitle}</span>
                    <span className="text-gray-600"> at </span>
                    <span className="font-medium">{completion.locationName}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{completion.actualDuration || 0} min</div>
                    <div className="text-xs text-gray-500">
                      {new Date(completion.completedAt?.toDate ? completion.completedAt.toDate() : completion.completedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon="✅"
              title="No Tasks Completed Yet"
              description="Complete your first task to see your recent activity here!"
              action={{
                label: "View Locations",
                onClick: () => router.push("/org/locations")
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function OrgDashboardPage() {
  const router = useRouter();
  const { user, claims, getIdToken } = useAuth();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user || !claims || !claims.organizationId) {
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;

      // Get user info
      const userResponse = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
          setCurrentUser(userData);

          // Get dashboard data
          const dataResponse = await fetch(`/api/v1/organizations/${claims.organizationId}/dashboard`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (dataResponse.ok) {
            const data = await dataResponse.json();
            setDashboardData(data.data || data);
          }

          // Load locations for teleoperators
          if (userData.role === "oem_teleoperator") {
            const locationsResponse = await fetch(`/api/v1/locations?organizationId=${claims.organizationId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (locationsResponse.ok) {
              const locationsData = await locationsResponse.json();
              setLocations(locationsData.locations || []);
            }

            // Load recent sessions
            const sessionsResponse = await fetch(`/api/v1/sessions?teleoperatorId=${userData.teleoperatorId}&limit=10`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            if (sessionsResponse.ok) {
              const sessionsData = await sessionsResponse.json();
              setRecentSessions(sessionsData.sessions || []);
            }
          }
        }
      } catch (error: any) {
        console.error("Failed to load dashboard:", error);
        setError(error.message || "Failed to load dashboard data");
        toast.error("Failed to load dashboard. Please try again.");
      } finally {
        setLoading(false);
      }
  }, [user, claims, getIdToken]);

  useEffect(() => {
    if (user && claims) {
      loadData();

      // Poll for updates every 30 seconds
      const interval = setInterval(() => {
        loadData();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [user, claims, loadData]);

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6" role="alert">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">⚠️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-1">Error Loading Dashboard</h3>
              <p className="text-sm text-red-700 mb-3">{error}</p>
              <button
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  // Trigger reload
                  window.location.reload();
                }}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
                aria-label="Retry loading dashboard"
              >
                Try Again →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isManager = currentUser?.role === "org_manager";
  const isTeleoperator = currentUser?.role === "oem_teleoperator";

  return (
    <div className="p-8">
      {isManager && <ManagerDashboard data={dashboardData} user={currentUser} router={router} />}
      {isTeleoperator && (
        <TeleoperatorDashboard
          user={currentUser}
          router={router}
          recentSessions={recentSessions}
          locations={locations}
          data={dashboardData}
        />
      )}
      {!isManager && !isTeleoperator && (
        <div className="p-8 text-center text-gray-600">Invalid role. Please contact support.</div>
      )}
    </div>
  );
}
