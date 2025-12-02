"use client";

/**
 * Organization Tasks Page
 * Shows task history/completions (role-based view)
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function OrgTasksPage() {
  const router = useRouter();
  const { user, claims, getIdToken } = useAuth();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [completions, setCompletions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user || !claims || !claims.organizationId) return;

      try {
        const token = await getIdToken();
        if (!token) return;

        // Get user info and dashboard data in parallel
        const [userResponse, dashboardResponse] = await Promise.all([
          fetch("/api/auth/me", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`/api/v1/organizations/${claims.organizationId}/dashboard`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        let userData = null;
        if (userResponse.ok) {
          userData = await userResponse.json();
          setCurrentUser(userData);
        }

        if (dashboardResponse.ok) {
          const dashboardData = await dashboardResponse.json();
          const allCompletions = dashboardData.data?.recentCompletions || [];

          // Filter based on role
          if (userData?.role === "oem_teleoperator") {
            // Teleoperators only see their own completions
            setCompletions(
              allCompletions.filter((c: any) => c.teleoperatorId === userData.teleoperatorId),
            );
          } else {
            // Managers see all completions
            setCompletions(allCompletions);
          }
        }
      } catch (error) {
        console.error("Failed to load tasks:", error);
      } finally {
        setLoading(false);
      }
    }

    if (user && claims) {
      loadData();
    }
  }, [user, claims, getIdToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const isManager = currentUser?.role === "org_manager";

  function formatTimeAgo(timestamp: any): string {
    let timeMs: number;

    if (timestamp && typeof timestamp === "object" && "toMillis" in timestamp) {
      timeMs = timestamp.toMillis();
    } else if (typeof timestamp === "number") {
      timeMs = timestamp;
    } else if (typeof timestamp === "string") {
      timeMs = new Date(timestamp).getTime();
    } else {
      return "Unknown";
    }

    const now = Date.now();
    const diff = now - timeMs;
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">{isManager ? "📋 Task History" : "✅ My Tasks"}</h1>

      {completions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">
              {isManager ? "No task completions yet." : "No tasks completed yet. Get started!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {completions.map((completion: any) => (
            <Card key={completion.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{completion.taskTitle}</h3>
                      <Badge variant={completion.status === "completed" ? "default" : "secondary"}>
                        {completion.status}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600 mb-3">
                      {isManager && (
                        <p>
                          <span className="font-medium">Teleoperator:</span> {completion.teleoperatorName}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Location:</span> {completion.locationName}
                      </p>
                      <p>
                        <span className="font-medium">Duration:</span> {completion.actualDuration || 0} min
                        {completion.estimatedDuration && (
                          <span className="text-gray-400">
                            {" "}
                            (estimated: {completion.estimatedDuration} min)
                          </span>
                        )}
                      </p>
                    </div>

                    {completion.notes && (
                      <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-500">
                        <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
                        <p className="text-sm text-gray-700">{completion.notes}</p>
                      </div>
                    )}

                    {completion.issuesEncountered && (
                      <div className="mt-3 p-3 bg-orange-50 rounded border-l-4 border-orange-500">
                        <p className="text-sm font-medium text-gray-700 mb-1">Issues:</p>
                        <p className="text-sm text-gray-700">{completion.issuesEncountered}</p>
                      </div>
                    )}
                  </div>

                  <div className="text-right text-sm text-gray-500 ml-4">
                    <p>{formatTimeAgo(completion.completedAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

