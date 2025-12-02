"use client";

/**
 * Organization Dashboard Page
 * Comprehensive operations dashboard with metrics, teleoperator performance, and task history
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import type { Organization } from "@/lib/repositories/organizations";
import type { Teleoperator, TaskCompletion } from "@/lib/types";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type DashboardData = {
  teleoperators: Array<
    Teleoperator & {
      completions: TaskCompletion[];
      avgDuration: number;
      successRate: number;
      role?: "org_manager" | "oem_teleoperator"; // Role from users collection
    }
  >;
  locations: Array<{
    id: string;
    name: string;
    address: string;
    taskCount: number;
    completions: number;
  }>;
  totalCompletions: number;
  avgDuration: number;
  topPerformers: Array<{
    id: string;
    name: string;
    email: string;
    completions: number;
    totalDuration: number;
  }>;
  recentCompletions: TaskCompletion[];
};

export default function OrganizationDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const organizationId = params.id as string;
  const { user, claims } = useAuth();

  // Initialize activeTab from URL params or default to "overview"
  const getInitialTab = (): "overview" | "teleoperators" | "tasks" | "locations" => {
    const tab = searchParams.get("tab");
    if (tab === "overview" || tab === "teleoperators" || tab === "tasks" || tab === "locations") {
      return tab;
    }
    return "overview";
  };

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "teleoperators" | "tasks" | "locations">(
    getInitialTab(),
  );

  // Update URL when tab changes
  const handleTabChange = (tab: "overview" | "teleoperators" | "tasks" | "locations") => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const [showAddTeleoperator, setShowAddTeleoperator] = useState(false);
  const [editingTeleoperator, setEditingTeleoperator] = useState<any>(null);
  const [showEditOrg, setShowEditOrg] = useState(false);
  const [expandedTeleop, setExpandedTeleop] = useState<string | null>(null);

  const [teleoperatorForm, setTeleoperatorForm] = useState({
    email: "",
    displayName: "",
    role: "oem_teleoperator" as "org_manager" | "oem_teleoperator",
  });

  const [orgForm, setOrgForm] = useState({
    name: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    status: "active" as "active" | "inactive",
  });

  // Load data function (can be called to refresh)
  const loadData = useCallback(async () => {
    if (!user || !organizationId) return;

    try {
      setLoading(true);
      const token = await user.getIdToken();

      // Load organization
      const orgResponse = await fetch(`/api/v1/organizations/${organizationId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!orgResponse.ok) {
        if (orgResponse.status === 404) {
          toast.error("Organization not found");
          router.push("/admin/organizations");
          return;
        }
        throw new Error("Failed to load organization");
      }

      const orgData = await orgResponse.json();
      const org: Organization = orgData.organization;
      setOrganization(org);
      setOrgForm({
        name: org.name || "",
        contactName: org.contactName || "",
        contactEmail: org.contactEmail || "",
        contactPhone: org.contactPhone || "",
        status: org.status || "active",
      });

      // Load dashboard data
      const dashboardResponse = await fetch(`/api/v1/organizations/${organizationId}/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (dashboardResponse.ok) {
        const dashboardResult = await dashboardResponse.json();
        setDashboardData(dashboardResult.data);
      } else {
        console.error("Failed to load dashboard data");
        // Set empty data structure
        setDashboardData({
          teleoperators: [],
          locations: [],
          totalCompletions: 0,
          avgDuration: 0,
          topPerformers: [],
          recentCompletions: [],
        });
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load organization data");
      router.push("/admin/organizations");
    } finally {
      setLoading(false);
    }
  }, [user, organizationId, router]);

  // Load organization and dashboard data
  useEffect(() => {
    if (user && organizationId) {
      loadData();
    }
  }, [user, organizationId, loadData]);

  // Sync activeTab from URL params (e.g., on browser back/forward)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "overview" || tab === "teleoperators" || tab === "tasks" || tab === "locations") {
      setActiveTab(tab);
    } else if (!tab) {
      // If no tab param, default to overview
      setActiveTab("overview");
    }
  }, [searchParams]);

  async function handleAddTeleoperator() {
    if (!user || !organization) return;

    if (!teleoperatorForm.email || !teleoperatorForm.displayName) {
      toast.error("Email and display name are required");
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/v1/teleoperators", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: teleoperatorForm.email,
          displayName: teleoperatorForm.displayName,
          role: teleoperatorForm.role,
          partnerOrgId: organization.partnerId,
          organizationId: organization.id,
          organizationName: organization.name,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create team member");
      }

      const result = await response.json();
      const roleLabel = teleoperatorForm.role === "org_manager" ? "Manager" : "Teleoperator";
      
      toast.success(
        (t) => (
          <div>
            <p className="font-bold">{roleLabel} added successfully!</p>
            {result.password && (
              <p className="text-sm">Temporary password: {result.password}</p>
            )}
          </div>
        ),
        { duration: 10000 }
      );
      
      setShowAddTeleoperator(false);
      setTeleoperatorForm({ email: "", displayName: "", role: "oem_teleoperator" });

      // Reload data without changing tab
      await loadData();
    } catch (error: any) {
      console.error("Failed to create team member:", error);
      toast.error(error.message || "Failed to create team member");
    }
  }

  async function handleDeleteTeleoperator(teleopId: string, name: string) {
    if (!user) return;

    if (!confirm(`Delete teleoperator "${name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/v1/teleoperators/${teleopId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete teleoperator");
      }

      toast.success("Teleoperator deleted");
      // Reload data without changing tab
      await loadData();
    } catch (error: any) {
      console.error("Failed to delete teleoperator:", error);
      toast.error(error.message || "Failed to delete teleoperator");
    }
  }

  async function handleUpdateOrganization() {
    if (!user || !organization) return;

    if (!orgForm.name.trim()) {
      toast.error("Organization name is required");
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/v1/organizations/${organizationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: orgForm.name.trim(),
          contactName: orgForm.contactName.trim() || undefined,
          contactEmail: orgForm.contactEmail.trim() || undefined,
          contactPhone: orgForm.contactPhone.trim() || undefined,
          status: orgForm.status,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update organization");
      }

      toast.success("Organization updated successfully");
      setShowEditOrg(false);
      // Reload data without changing tab
      await loadData();
    } catch (error: any) {
      console.error("Failed to update organization:", error);
      toast.error(error.message || "Failed to update organization");
    }
  }

  async function handleUnassignLocation(locationId: string, locationName: string) {
    if (!user || !organization) return;

    if (!confirm(`Unassign "${locationName}" from "${organization.name}"?`)) {
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/v1/locations/${locationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assignedOrganizationId: null,
          assignedOrganizationName: null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to unassign location");
      }

      toast.success(`Location "${locationName}" unassigned successfully`);
      // Reload data without changing tab
      await loadData();
    } catch (error: any) {
      console.error("Failed to unassign location:", error);
      toast.error(error.message || "Failed to unassign location");
    }
  }

  async function handleDeleteOrganization() {
    if (!user || !organization) return;

    if (
      !confirm(
        `Delete "${organization.name}"? This will also affect all teleoperators in this organization. This cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/v1/organizations/${organizationId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete organization");
      }

      toast.success("Organization deleted");
      router.push("/admin/organizations");
    } catch (error: any) {
      console.error("Failed to delete organization:", error);
      toast.error(error.message || "Failed to delete organization");
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!organization || !dashboardData) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-gray-600">Organization not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <Link href="/admin/organizations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Organizations
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl mb-2">{organization.name}</CardTitle>
              <Badge variant={organization.status === "active" ? "default" : "secondary"}>
                {organization.status}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowEditOrg(true)} variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit Organization
              </Button>
              <Button onClick={handleDeleteOrganization} variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex gap-1 px-6">
            <TabButton active={activeTab === "overview"} onClick={() => handleTabChange("overview")}>
              📊 Overview
            </TabButton>
            <TabButton
              active={activeTab === "teleoperators"}
              onClick={() => handleTabChange("teleoperators")}
              count={dashboardData.teleoperators.length}
            >
              👥 Teleoperators
            </TabButton>
            <TabButton
              active={activeTab === "locations"}
              onClick={() => handleTabChange("locations")}
              count={dashboardData.locations.length}
            >
              📍 Locations
            </TabButton>
            <TabButton
              active={activeTab === "tasks"}
              onClick={() => handleTabChange("tasks")}
              count={dashboardData.totalCompletions}
            >
              ✅ Task History
            </TabButton>
          </div>
        </div>

        {/* Tab Content */}
        <CardContent className="p-6">
          {activeTab === "overview" && (
            <OverviewTab data={dashboardData} organization={organization} />
          )}

          {activeTab === "teleoperators" && (
            <TeleoperatorsTab
              data={dashboardData}
              organizationId={organizationId}
              organizationName={organization.name}
              showAdd={showAddTeleoperator}
              setShowAdd={setShowAddTeleoperator}
              teleoperatorForm={teleoperatorForm}
              setTeleoperatorForm={setTeleoperatorForm}
              onAdd={handleAddTeleoperator}
              onDelete={handleDeleteTeleoperator}
              expandedTeleop={expandedTeleop}
              setExpandedTeleop={setExpandedTeleop}
              onReload={loadData}
            />
          )}

          {activeTab === "locations" && (
            <LocationsTab
              data={dashboardData}
              organizationId={organizationId}
              onUnassign={handleUnassignLocation}
              user={user}
            />
          )}

          {activeTab === "tasks" && <TaskHistoryTab data={dashboardData} />}
        </CardContent>
      </Card>

      {/* Edit Organization Modal */}
      {showEditOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Edit Organization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="org-name">Organization Name *</Label>
                  <Input
                    id="org-name"
                    value={orgForm.name}
                    onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="org-contactName">Contact Name</Label>
                  <Input
                    id="org-contactName"
                    value={orgForm.contactName}
                    onChange={(e) => setOrgForm({ ...orgForm, contactName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="org-contactEmail">Contact Email</Label>
                  <Input
                    id="org-contactEmail"
                    type="email"
                    value={orgForm.contactEmail}
                    onChange={(e) => setOrgForm({ ...orgForm, contactEmail: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="org-contactPhone">Contact Phone</Label>
                  <Input
                    id="org-contactPhone"
                    type="tel"
                    value={orgForm.contactPhone}
                    onChange={(e) => setOrgForm({ ...orgForm, contactPhone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="org-status">Status</Label>
                  <select
                    id="org-status"
                    className="w-full p-2 border rounded"
                    value={orgForm.status}
                    onChange={(e) =>
                      setOrgForm({ ...orgForm, status: e.target.value as "active" | "inactive" })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUpdateOrganization}>Save Changes</Button>
                  <Button variant="outline" onClick={() => setShowEditOrg(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Tab Button Component
function TabButton({
  active,
  onClick,
  children,
  count = null,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number | null;
}) {
  return (
    <button
      onClick={onClick}
      className={`py-3 px-4 border-b-2 font-medium transition ${
        active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-gray-600 hover:text-gray-900"
      }`}
    >
      {children}
      {count !== null && (
        <span
          className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
            active ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// OVERVIEW TAB
function OverviewTab({
  data,
  organization,
}: {
  data: DashboardData;
  organization: Organization;
}) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard title="Assigned Locations" value={data.locations.length} icon="📍" color="blue" />
        <MetricCard
          title="Total Teleoperators"
          value={data.teleoperators.length}
          icon="👥"
          color="purple"
        />
        <MetricCard
          title="Tasks Completed"
          value={data.totalCompletions}
          icon="✅"
          color="green"
        />
        <MetricCard
          title="Avg. Task Duration"
          value={`${Math.round(data.avgDuration)} min`}
          icon="⏱️"
          color="orange"
        />
      </div>

      {/* Top Performers - Hidden for now */}
      {/* <Card>
        <CardHeader>
          <CardTitle>🏆 Top Performers (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {data.topPerformers.length === 0 ? (
            <p className="text-gray-500">No performance data yet.</p>
          ) : (
            <div className="space-y-3">
              {data.topPerformers.map((teleop, index) => (
                <div
                  key={teleop.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                    <div>
                      <div className="font-semibold">{teleop.name}</div>
                      <div className="text-sm text-gray-600">{teleop.email}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">{teleop.completions}</div>
                    <div className="text-sm text-gray-600">tasks completed</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card> */}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>📈 Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentCompletions.length === 0 ? (
            <p className="text-gray-500">No recent activity.</p>
          ) : (
            <div className="space-y-2">
              {data.recentCompletions.slice(0, 10).map((completion) => (
                <div
                  key={completion.id}
                  className="flex justify-between items-center p-3 hover:bg-gray-50 rounded"
                >
                  <div>
                    <span className="font-medium">{completion.teleoperatorName}</span>
                    <span className="text-gray-600"> completed </span>
                    <span className="font-medium">{completion.taskTitle}</span>
                    <span className="text-gray-600"> at </span>
                    <span className="font-medium">{completion.locationName}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatTimeAgo(completion.completedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle>ℹ️ Organization Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Contact Name</Label>
              <p className="text-lg">{organization.contactName || "Not set"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Contact Email</Label>
              <p className="text-lg">{organization.contactEmail || "Not set"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Contact Phone</Label>
              <p className="text-lg">{organization.contactPhone || "Not set"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Status</Label>
              <p className="text-lg capitalize">{organization.status}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// TELEOPERATORS TAB
function TeleoperatorsTab({
  data,
  organizationId,
  organizationName,
  showAdd,
  setShowAdd,
  teleoperatorForm,
  setTeleoperatorForm,
  onAdd,
  onDelete,
  expandedTeleop,
  setExpandedTeleop,
  onReload,
}: {
  data: DashboardData;
  organizationId: string;
  organizationName: string;
  showAdd: boolean;
  setShowAdd: (show: boolean) => void;
  teleoperatorForm: { email: string; displayName: string; role: "org_manager" | "oem_teleoperator" };
  setTeleoperatorForm: (form: { email: string; displayName: string; role: "org_manager" | "oem_teleoperator" }) => void;
  onAdd: () => Promise<void>;
  onDelete: (id: string, name: string) => Promise<void>;
  expandedTeleop: string | null;
  setExpandedTeleop: (id: string | null) => void;
  onReload: () => Promise<void>;
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">👥 Team Members ({data.teleoperators.length})</h3>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      {/* Add Team Member Form */}
      {showAdd && (
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-lg">Add Team Member to {organizationName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="role">Role *</Label>
                <select
                  id="role"
                  className="w-full p-2 border rounded"
                  value={teleoperatorForm.role}
                  onChange={(e) =>
                    setTeleoperatorForm({ ...teleoperatorForm, role: e.target.value as any })
                  }
                >
                  <option value="oem_teleoperator">Teleoperator</option>
                  <option value="org_manager">Organization Manager</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  <strong>Manager:</strong> View analytics, team performance (read-only)<br/>
                  <strong>Teleoperator:</strong> Execute tasks, mark complete
                </p>
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={teleoperatorForm.email}
                  onChange={(e) =>
                    setTeleoperatorForm({ ...teleoperatorForm, email: e.target.value })
                  }
                  placeholder="person@example.com"
                />
              </div>
              <div>
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  value={teleoperatorForm.displayName}
                  onChange={(e) =>
                    setTeleoperatorForm({ ...teleoperatorForm, displayName: e.target.value })
                  }
                  placeholder="John Smith"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={onAdd}>Add</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAdd(false);
                    setTeleoperatorForm({ email: "", displayName: "", role: "oem_teleoperator" });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teleoperators List */}
      {data.teleoperators.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p>No teleoperators in this organization yet.</p>
            <Button onClick={() => setShowAdd(true)} variant="outline" className="mt-3">
              Add your first teleoperator
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.teleoperators.map((teleop) => (
            <Card key={teleop.teleoperatorId}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-xl font-semibold">{teleop.displayName}</h4>
                      <Badge
                        className={
                          teleop.role === "org_manager"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }
                      >
                        {teleop.role === "org_manager" ? "👔 Manager" : "🤖 Teleoperator"}
                      </Badge>
                      {teleop.role === "oem_teleoperator" && (
                        <Badge
                          variant={
                            teleop.currentStatus === "available"
                              ? "default"
                              : teleop.currentStatus === "busy"
                                ? "secondary"
                                : "secondary"
                          }
                        >
                          {teleop.currentStatus}
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-600 mb-3">{teleop.email}</p>

                    {/* Quick Stats */}
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-gray-600">Tasks Completed: </span>
                        <span className="font-semibold text-green-600">
                          {teleop.completions?.length || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Avg. Duration: </span>
                        <span className="font-semibold">
                          {teleop.avgDuration ? `${Math.round(teleop.avgDuration)} min` : "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Success Rate: </span>
                        <span className="font-semibold text-green-600">
                          {teleop.successRate ? `${Math.round(teleop.successRate)}%` : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setExpandedTeleop(expandedTeleop === teleop.teleoperatorId ? null : teleop.teleoperatorId)
                      }
                    >
                      {expandedTeleop === teleop.teleoperatorId ? "▼ Hide Details" : "▶ View Tasks"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        await onDelete(teleop.teleoperatorId, teleop.displayName);
                        await onReload();
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>

                {/* Expanded Task History */}
                {expandedTeleop === teleop.teleoperatorId && (
                  <div className="mt-4 pt-4 border-t bg-gray-50 p-4 rounded">
                    <h5 className="font-semibold mb-4">Task Completion History</h5>
                    {teleop.completions && teleop.completions.length > 0 ? (
                      <div className="space-y-2">
                        {teleop.completions.map((completion) => (
                          <TaskCompletionRow key={completion.id} completion={completion} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No tasks completed yet.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// LOCATIONS TAB
function LocationsTab({
  data,
  organizationId,
  onUnassign,
  user,
}: {
  data: DashboardData;
  organizationId: string;
  onUnassign: (locationId: string, locationName: string) => Promise<void>;
  user: any;
}) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">📍 Assigned Locations ({data.locations.length})</h3>

      {data.locations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p>No locations assigned to this organization yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.locations.map((location) => (
            <Card key={location.id} className="hover:shadow-lg transition">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{location.name}</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnassign(location.id, location.name);
                    }}
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  >
                    Unassign
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p
                  className="text-gray-600 text-sm mb-4 cursor-pointer hover:text-blue-600"
                  onClick={() => router.push(`/admin/locations/${location.id}`)}
                >
                  {location.address}
                </p>

                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Tasks: </span>
                    <span className="font-semibold">{location.taskCount || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Completions: </span>
                    <span className="font-semibold text-green-600">{location.completions || 0}</span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => router.push(`/admin/locations/${location.id}`)}
                >
                  View Location Details →
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// TASK HISTORY TAB
function TaskHistoryTab({ data }: { data: DashboardData }) {
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  const filteredCompletions = data.recentCompletions
    .filter((c) => filter === "all" || c.status === filter)
    .sort((a, b) => {
      if (sortBy === "recent") {
        const aTime = getTimestampMillis(a.completedAt);
        const bTime = getTimestampMillis(b.completedAt);
        return bTime - aTime;
      }
      if (sortBy === "duration") {
        return (b.actualDuration || 0) - (a.actualDuration || 0);
      }
      return 0;
    });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">✅ Task Completion History</h3>

        <div className="flex gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All Tasks</option>
            <option value="completed">Completed</option>
            <option value="error">With Errors</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="recent">Most Recent</option>
            <option value="duration">Longest Duration</option>
          </select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-semibold">Task</th>
                  <th className="text-left p-4 font-semibold">Teleoperator</th>
                  <th className="text-left p-4 font-semibold">Location</th>
                  <th className="text-left p-4 font-semibold">Duration</th>
                  <th className="text-left p-4 font-semibold">Completed</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompletions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      No task completions found.
                    </td>
                  </tr>
                ) : (
                  filteredCompletions.map((completion) => (
                    <tr key={completion.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div className="font-medium">{completion.taskTitle}</div>
                        {completion.taskCategory && (
                          <div className="text-sm text-gray-600">{completion.taskCategory}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{completion.teleoperatorName}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{completion.locationName}</div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono">{completion.actualDuration} min</span>
                        {completion.estimatedDuration && (
                          <div className="text-xs text-gray-500">
                            (est. {completion.estimatedDuration} min)
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {formatDate(completion.completedAt)}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            completion.status === "completed"
                              ? "default"
                              : completion.status === "error"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {completion.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// HELPER COMPONENTS

function MetricCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: string;
  color: "blue" | "purple" | "green" | "orange";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <div className={`text-3xl p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
          <div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-gray-600">{title}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskCompletionRow({ completion }: { completion: TaskCompletion }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border rounded p-3">
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1">
          <span className="font-medium">{completion.taskTitle}</span>
          <span className="text-gray-600 text-sm ml-2">at {completion.locationName}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">{completion.actualDuration} min</span>
          <span className="text-gray-500">{formatTimeAgo(completion.completedAt)}</span>
          <Badge
            variant={
              completion.status === "completed" ? "default" : completion.status === "error" ? "destructive" : "secondary"
            }
          >
            {completion.status}
          </Badge>
          <button className="text-gray-400">{expanded ? "▼" : "▶"}</button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="text-gray-600 font-medium">Started:</span>
            <span>{formatDateTime(completion.startedAt)}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-600 font-medium">Completed:</span>
            <span>{formatDateTime(completion.completedAt)}</span>
          </div>
          {completion.notes && (
            <div>
              <span className="text-gray-600 font-medium">Notes:</span>
              <p className="text-gray-800 mt-1">{completion.notes}</p>
            </div>
          )}
          {completion.issuesEncountered && (
            <div>
              <span className="text-red-600 font-medium">Issues:</span>
              <p className="text-red-800 mt-1">{completion.issuesEncountered}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// HELPER FUNCTIONS

function getTimestampMillis(timestamp: any): number {
  if (!timestamp) return 0;
  if (typeof timestamp === "object" && "toMillis" in timestamp) {
    return timestamp.toMillis();
  }
  if (typeof timestamp === "number") {
    return timestamp;
  }
  if (typeof timestamp === "string") {
    return new Date(timestamp).getTime();
  }
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }
  return 0;
}

function formatTimeAgo(timestamp: any): string {
  const now = Date.now();
  const time = getTimestampMillis(timestamp);
  const diff = now - time;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(timestamp: any): string {
  const time = getTimestampMillis(timestamp);
  return new Date(time).toLocaleDateString();
}

function formatDateTime(timestamp: any): string {
  const time = getTimestampMillis(timestamp);
  return new Date(time).toLocaleString();
}
