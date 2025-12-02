"use client";

/**
 * Organization Location Detail Page
 * Recurring task completions - tasks can be completed multiple times
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskCompletionModal } from "@/components/org/TaskCompletionModal";
import toast from "react-hot-toast";

export default function OrgLocationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locationId = params.id as string;
  const { user, claims, getIdToken } = useAuth();

  const [location, setLocation] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [todaySession, setTodaySession] = useState<any>(null);
  const [taskCompletions, setTaskCompletions] = useState<Record<string, any[]>>({}); // taskId -> array of completions
  const [loading, setLoading] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [completingTask, setCompletingTask] = useState<any>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "todo" | "completed">("all");

  useEffect(() => {
    async function loadData() {
      if (!user || !locationId) return;

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

          // Load today's session at this location (if exists) for teleoperators
          if (userData.role === "oem_teleoperator" && userData.teleoperatorId) {
            const sessionResponse = await fetch(
              `/api/v1/sessions?today=true&teleoperatorId=${userData.teleoperatorId}&locationId=${locationId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            if (sessionResponse.ok) {
              const sessionData = await sessionResponse.json();
              if (sessionData.sessions && sessionData.sessions.length > 0) {
                const session = sessionData.sessions[0];
                setTodaySession(session);

                // Load all completions for this session (grouped by task)
                const completionsResponse = await fetch(
                  `/api/v1/task-completions?bySession=true&sessionId=${session.id}`,
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );
                if (completionsResponse.ok) {
                  const completionsData = await completionsResponse.json();
                  // Convert to arrays per task
                  const completionsByTask: Record<string, any[]> = {};
                  Object.keys(completionsData.completions || {}).forEach((taskId) => {
                    const completion = completionsData.completions[taskId];
                    // If it's already an array, use it; otherwise wrap in array
                    if (Array.isArray(completion)) {
                      completionsByTask[taskId] = completion;
                    } else {
                      completionsByTask[taskId] = [completion];
                    }
                  });
                  setTaskCompletions(completionsByTask);
                }
              }
            }
          }
        }

        // Get location with tasks
        const locationResponse = await fetch(`/api/v1/locations/${locationId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!locationResponse.ok) {
          router.push("/org/locations");
          return;
        }

        const locationData = await locationResponse.json();

        // Verify user has access to this location
        if (locationData.assignedOrganizationId !== claims?.organizationId) {
          router.push("/org/locations");
          return;
        }

        // Get tasks for this location (all active tasks)
        const tasksResponse = await fetch(`/api/v1/locations/${locationId}/tasks?status=active`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          const tasks = tasksData.tasks || [];

          // Load instructions for each task
          const tasksWithInstructions = await Promise.all(
            tasks.map(async (task: any) => {
              try {
                const instructionsResponse = await fetch(
                  `/api/v1/locations/${locationId}/tasks/${task.id}/instructions`,
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  },
                );

                if (instructionsResponse.ok) {
                  const instructionsData = await instructionsResponse.json();
                  return {
                    ...task,
                    instructions: instructionsData.instructions || [],
                  };
                }
                return { ...task, instructions: [] };
              } catch (error) {
                console.error(`Failed to load instructions for task ${task.id}:`, error);
                return { ...task, instructions: [] };
              }
            }),
          );

          locationData.tasks = tasksWithInstructions;
        }

        setLocation(locationData);
      } catch (error) {
        console.error("Failed to load location:", error);
        toast.error("Failed to load location");
        router.push("/org/locations");
      } finally {
        setLoading(false);
      }
    }

    if (user && locationId) {
      loadData();
    }
  }, [user, locationId, router, claims, getIdToken]);

  // Task completion handler - session creation is handled by API route
  async function handleTaskCompletion(completionData: any) {
    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Get current user info
      const userResponse = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error("Failed to get user info");
      }

      const userData = await userResponse.json();

      // Prepare completion data (API route will handle session creation)
      const fullCompletionData = {
        ...completionData,
        organizationId: userData.organizationId,
        organizationName: userData.organizationName,
        teleoperatorId: userData.teleoperatorId,
        teleoperatorName: userData.displayName || userData.email,
        locationName: location.name,
      };

      // Record completion (API route handles session creation automatically)
      const response = await fetch("/api/v1/task-completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(fullCompletionData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to record completion");
      }

      const result = await response.json();

      // Get current completion count for this task
      const currentCount = (taskCompletions[completingTask.id] || []).length;
      const newCount = currentCount + 1;

      // Reload today's session and completions to show updated stats
      if (userData.role === "oem_teleoperator" && userData.teleoperatorId) {
        const sessionResponse = await fetch(
          `/api/v1/sessions?today=true&teleoperatorId=${userData.teleoperatorId}&locationId=${locationId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData.sessions && sessionData.sessions.length > 0) {
            const session = sessionData.sessions[0];
            setTodaySession(session);

            // Reload completions
            const completionsResponse = await fetch(
              `/api/v1/task-completions?bySession=true&sessionId=${session.id}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            if (completionsResponse.ok) {
              const completionsData = await completionsResponse.json();
              // Convert to arrays per task
              const completionsByTask: Record<string, any[]> = {};
              Object.keys(completionsData.completions || {}).forEach((taskId) => {
                const completion = completionsData.completions[taskId];
                if (Array.isArray(completion)) {
                  completionsByTask[taskId] = completion;
                } else {
                  completionsByTask[taskId] = [completion];
                }
              });
              setTaskCompletions(completionsByTask);
            }
          }
        }
      }

      // Success feedback
      const statusEmojiMap: Record<string, string> = {
        completed: "✅",
        incomplete: "⚠️",
        error: "❌",
      };
      const statusEmoji = statusEmojiMap[completionData.status] || "✅";

      toast.success(
        <div>
          <p className="font-bold">{statusEmoji} Task Completed!</p>
          <p className="text-sm">{completionData.taskTitle}</p>
          <p className="text-xs text-green-700 mt-1">
            {newCount === 1 ? "First completion today" : `Completed ${newCount}x today`}
          </p>
        </div>,
        { duration: 5000 }
      );

      setShowCompleteModal(false);
      setCompletingTask(null);

      // Reload location data AND tasks
      const locationResponse = await fetch(`/api/v1/locations/${locationId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (locationResponse.ok) {
        const locationData = await locationResponse.json();

        // Reload tasks for this location
        const tasksResponse = await fetch(`/api/v1/locations/${locationId}/tasks?status=active`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          const tasks = tasksData.tasks || [];

          // Load instructions for each task
          const tasksWithInstructions = await Promise.all(
            tasks.map(async (task: any) => {
              try {
                const instructionsResponse = await fetch(
                  `/api/v1/locations/${locationId}/tasks/${task.id}/instructions`,
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );

                if (instructionsResponse.ok) {
                  const instructionsData = await instructionsResponse.json();
                  return {
                    ...task,
                    instructions: instructionsData.instructions || [],
                  };
                }
                return { ...task, instructions: [] };
              } catch (error) {
                console.error(`Failed to load instructions for task ${task.id}:`, error);
                return { ...task, instructions: [] };
              }
            })
          );

          locationData.tasks = tasksWithInstructions;
        }

        setLocation(locationData);
      }
    } catch (error: any) {
      console.error("Failed to record completion:", error);
      toast.error(error.message || "Failed to record completion");
      throw error;
    }
  }

  function toggleTask(taskId: string) {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!location) return null;

  const isTeleoperator = currentUser?.role === "oem_teleoperator";

  // Filter tasks based on completion status
  const allTasks = location.tasks || [];
  const completedTasks = allTasks.filter((task: any) => {
    const completions = taskCompletions[task.id] || [];
    return completions.length > 0;
  });
  const todoTasks = allTasks.filter((task: any) => {
    const completions = taskCompletions[task.id] || [];
    return completions.length === 0;
  });

  const filteredTasks =
    filter === "all"
      ? allTasks
      : filter === "completed"
        ? completedTasks
        : todoTasks;

  return (
    <div className="space-y-6">
      <button 
        onClick={() => router.push("/org/locations")} 
        className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
      >
        ← Back to Locations
      </button>

      {/* Location Header */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-slate-900 mb-1">📍 {location.name}</h1>
              <p className="text-sm text-slate-600">{location.address}</p>
            </div>
          </div>

          {/* Today's Session Summary */}
          {isTeleoperator && todaySession && todaySession.totalTasks > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-900">
                <span>📊</span>
                <p className="font-semibold">
                  Today&apos;s Session: {todaySession.totalTasks} task{todaySession.totalTasks !== 1 ? "s" : ""}{" "}
                  completed, {todaySession.totalDuration} minutes total
                </p>
              </div>
            </div>
          )}

          {/* Contact & Access Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {(location.primaryContact ||
              location.contactName ||
              location.contactPhone ||
              location.contactEmail) && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <h3 className="font-medium text-slate-900">Contact</h3>
                </div>
                {location.primaryContact?.name && <p>{location.primaryContact.name}</p>}
                {location.contactName && <p>{location.contactName}</p>}
                {(location.primaryContact?.phone || location.contactPhone) && (
                  <p className="text-sm text-gray-600">
                    {location.primaryContact?.phone || location.contactPhone}
                  </p>
                )}
                {(location.primaryContact?.email || location.contactEmail) && (
                  <p className="text-sm text-gray-600">
                    {location.primaryContact?.email || location.contactEmail}
                  </p>
                )}
              </div>
            )}

            {location.accessInstructions && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <h3 className="font-medium text-slate-900 mb-2">🔑 Access Instructions</h3>
                <p className="text-sm whitespace-pre-wrap text-slate-600">{location.accessInstructions}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-slate-900">📋 Tasks ({allTasks.length})</h2>
          </div>

          {/* Filter Tabs */}
          {allTasks.length > 0 && (
            <div className="flex gap-2 mb-6 border-b">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  filter === "all"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({allTasks.length})
              </button>
              <button
                onClick={() => setFilter("todo")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  filter === "todo"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                Not Started ({todoTasks.length})
              </button>
              <button
                onClick={() => setFilter("completed")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  filter === "completed"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                In Progress ({completedTasks.length})
              </button>
            </div>
          )}

          {allTasks.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg">
              <svg className="h-12 w-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-600">No tasks at this location.</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg">
              <p className="text-slate-600">
                {filter === "completed" ? "No tasks completed yet today." : "All tasks have been started!"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task: any) => {
                const completions = taskCompletions[task.id] || [];
                const completionCount = completions.length;
                const mostRecent = completions[0]; // Already sorted by date desc

                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    locationId={locationId}
                    locationName={location.name}
                    expanded={expandedTasks.has(task.id)}
                    onToggle={() => toggleTask(task.id)}
                    canComplete={isTeleoperator}
                    completionCount={completionCount}
                    completions={completions}
                    mostRecent={mostRecent}
                    onCompleteClick={(task) => {
                      setCompletingTask(task);
                      setShowCompleteModal(true);
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Completion Modal */}
      {showCompleteModal && completingTask && (
        <TaskCompletionModal
          task={completingTask}
          locationId={locationId}
          locationName={location.name}
          currentSession={todaySession}
          onComplete={handleTaskCompletion}
          onCancel={() => {
            setShowCompleteModal(false);
            setCompletingTask(null);
          }}
        />
      )}
    </div>
  );
}

function TaskCard({
  task,
  locationId,
  locationName,
  expanded,
  onToggle,
  canComplete,
  completionCount,
  completions,
  mostRecent,
  onCompleteClick,
}: {
  task: any;
  locationId: string;
  locationName: string;
  expanded: boolean;
  onToggle: () => void;
  canComplete: boolean;
  completionCount: number;
  completions: any[];
  mostRecent?: any;
  onCompleteClick: (task: any) => void;
}) {
  const hasCompletions = completionCount > 0;

  // Format time
  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // Calculate average duration
  const avgDuration =
    completions.length > 0
      ? Math.round(completions.reduce((sum, c) => sum + (c.actualDuration || 0), 0) / completions.length)
      : 0;

  return (
    <div
      className={`border-2 rounded-lg overflow-hidden transition-all ${
        hasCompletions ? "border-green-200 bg-green-50/30" : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="p-6 cursor-pointer hover:bg-slate-50/50" onClick={onToggle}>
        <div className="flex justify-between items-start">
          <div className="flex-1 flex items-start gap-3">
            {/* Completion Badge */}
            {hasCompletions && (
              <div className="flex-shrink-0 w-10 h-10 bg-green-500 text-white rounded-lg flex items-center justify-center font-semibold text-sm shadow-sm">
                {completionCount}x
              </div>
            )}

            {!hasCompletions && (
              <div className="flex-shrink-0 w-10 h-10 bg-slate-100 text-slate-400 rounded-lg flex items-center justify-center">
                ○
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className={`text-lg font-semibold ${hasCompletions ? "text-green-900" : "text-slate-900"}`}>
                  {task.title}
                </h3>

                {hasCompletions && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ {completionCount}x today
                  </span>
                )}
              </div>

              {task.description && (
                <p className={`mb-3 ${hasCompletions ? "text-green-800" : "text-slate-600"}`}>
                  {task.description}
                </p>
              )}

              <div className="flex gap-4 text-sm text-slate-600 mb-2">
                {task.estimatedDuration && <span>⏱️ Est: {task.estimatedDuration} min</span>}
                {avgDuration > 0 && <span>📊 Avg: {avgDuration} min</span>}
                {task.priority && <span>🎯 {task.priority}</span>}
                <span>📋 {task.instructions?.length || 0} steps</span>
              </div>

              {/* Most Recent Completion Summary */}
              {mostRecent && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <div className="flex items-center gap-2 text-sm text-green-800">
                    <span className="font-semibold">Last:</span>
                    <span>{formatTime(mostRecent.completedAt)}</span>
                    <span>•</span>
                    <span>{mostRecent.actualDuration} min</span>
                    <span>•</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        mostRecent.status === "completed"
                          ? "bg-green-200 text-green-800"
                          : mostRecent.status === "incomplete"
                            ? "bg-yellow-200 text-yellow-800"
                            : "bg-red-200 text-red-800"
                      }`}
                    >
                      {mostRecent.status === "completed"
                        ? "✅"
                        : mostRecent.status === "incomplete"
                          ? "⚠️"
                          : "❌"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button className="text-gray-400 ml-4">{expanded ? "▼" : "▶"}</button>
        </div>
      </div>

      {expanded && (
        <div className="border-t bg-slate-50 p-6">
          {/* Completion History */}
          {completions.length > 0 && (
            <div className="mb-6 pb-6 border-b">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <span>📊 Completion History</span>
                <span className="text-sm font-normal text-gray-600">
                  ({completions.length} time{completions.length !== 1 ? "s" : ""} today)
                </span>
              </h4>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {completions.map((completion, index) => (
                  <div key={completion.id} className="bg-white border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500">#{completions.length - index}</span>
                        <span className="text-sm font-medium">{completion.teleoperatorName}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            completion.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : completion.status === "incomplete"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {completion.status === "completed"
                            ? "✅ Done"
                            : completion.status === "incomplete"
                              ? "⚠️ Partial"
                              : "❌ Issues"}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{formatTime(completion.completedAt)}</span>
                    </div>

                    <div className="flex gap-3 text-xs text-gray-600">
                      <span>⏱️ {completion.actualDuration} min</span>
                      {completion.notes && <span>💬 Has notes</span>}
                      {completion.issuesEncountered && <span>⚠️ Has issues</span>}
                    </div>

                    {completion.notes && (
                      <p className="text-xs text-gray-700 mt-2 italic">&quot;{completion.notes}&quot;</p>
                    )}

                    {completion.issuesEncountered && (
                      <p className="text-xs text-orange-800 mt-2 p-2 bg-orange-50 rounded">
                        ⚠️ {completion.issuesEncountered}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <h4 className="font-semibold mb-4">📋 Instructions:</h4>

          <div className="space-y-4 mb-6">
            {task.instructions?.map((instruction: any, index: number) => (
              <InstructionCard key={instruction.id} instruction={instruction} index={index} />
            ))}
          </div>

          {/* Complete Button - ALWAYS SHOW for teleoperators */}
          {canComplete && (
            <div className="pt-6 border-t">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCompleteClick(task);
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <span className="text-2xl">✅</span>
                <span className="text-lg">
                  {hasCompletions ? `Complete Again (${completionCount + 1}x)` : "Complete Task"}
                </span>
              </button>

              {hasCompletions && (
                <p className="text-center text-sm text-slate-600 mt-2">
                  This task can be completed multiple times
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InstructionCard({ instruction, index }: { instruction: any; index: number }) {
  return (
    <div className="bg-white rounded-lg p-4 border">
      <div className="flex gap-2 mb-2">
        <span className="font-bold text-blue-600">{index + 1}.</span>
        <div className="flex-1">
          <h5 className="font-semibold">{instruction.title}</h5>
          {instruction.room && <p className="text-sm text-gray-500">Room: {instruction.room}</p>}
        </div>
      </div>

      {instruction.description && <p className="text-gray-800 mb-3 pl-6">{instruction.description}</p>}

      {/* Images */}
      {instruction.imageUrls?.length > 0 && (
        <div className="pl-6 mb-3">
          <p className="text-sm font-medium text-gray-700 mb-2">
            📷 Images ({instruction.imageUrls.length}):
          </p>
          <div className="grid grid-cols-3 gap-2">
            {instruction.imageUrls.map((url: string, idx: number) => (
              <Image
                key={idx}
                src={url}
                alt={`Step ${index + 1} - ${idx + 1}`}
                className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-90"
                onClick={() => window.open(url, "_blank")}
                width={96}
                height={96}
                unoptimized
              />
            ))}
          </div>
        </div>
      )}

      {/* Videos */}
      {instruction.videoUrls?.length > 0 && (
        <div className="pl-6 mb-3">
          <p className="text-sm font-medium text-gray-700 mb-2">
            🎥 Videos ({instruction.videoUrls.length}):
          </p>
          <div className="space-y-2">
            {instruction.videoUrls.map((url: string, idx: number) => (
              <video
                key={idx}
                src={url}
                controls
                className="w-full max-h-64 rounded"
                preload="metadata"
              >
                Your browser does not support video playback.
              </video>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {instruction.notes && (
        <div className="pl-6 p-3 bg-blue-50 rounded border-l-4 border-blue-500">
          <p className="text-sm font-medium text-gray-700">💡 Note:</p>
          <p className="text-gray-700">{instruction.notes}</p>
        </div>
      )}
    </div>
  );
}
