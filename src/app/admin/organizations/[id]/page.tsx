"use client";

/**
 * Organization Detail Page
 * Data-delivery focused dashboard for OEM partners
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  Package,
  Film,
  Clock,
  HardDrive,
  MapPin,
  Key,
  Settings,
  Building2,
  BedDouble,
  Bath,
  UtensilsCrossed,
  Sofa,
  ClipboardList,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { Organization } from "@/lib/repositories/organizations";

type TabType = "overview" | "deliveries" | "locations" | "api" | "settings";

interface Delivery {
  id: string;
  videoCount: number;
  sizeGB: number;
  hours?: number;
  description: string;
  date: string;
  partnerId?: string | null;
  partnerName?: string | null;
}

interface AssignedLocation {
  id: string;
  name: string;
  address: string;
  roomCounts: {
    bedroom: number;
    bathroom: number;
    kitchen: number;
    livingArea: number;
    other: number;
  };
  taskCount: number;
  totalSqFt?: number;
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const organizationId = params.id as string;
  const { user } = useAuth();

  // Initialize activeTab from URL params or default to "overview"
  const getInitialTab = (): TabType => {
    const tab = searchParams.get("tab");
    if (tab === "overview" || tab === "deliveries" || tab === "locations" || tab === "api" || tab === "settings") {
      return tab;
    }
    return "overview";
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab());
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [assignedLocations, setAssignedLocations] = useState<AssignedLocation[]>([]);
  const [availableLocations, setAvailableLocations] = useState<AssignedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditOrg, setShowEditOrg] = useState(false);

  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Sync activeTab from URL params (e.g., on browser back/forward)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "overview" || tab === "deliveries" || tab === "locations" || tab === "api" || tab === "settings") {
      setActiveTab(tab);
    } else if (!tab) {
      setActiveTab("overview");
    }
  }, [searchParams]);

  const loadData = useCallback(async () => {
    if (!user || !organizationId) return;

    try {
      setLoading(true);
      const token = await user.getIdToken();

      // Load organization
      const orgResponse = await fetch(`/api/v1/organizations/${organizationId}`, {
        headers: { Authorization: `Bearer ${token}` },
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
      setOrganization(orgData.organization);

      // Load deliveries for this partner
      const deliveriesRes = await fetch("/api/admin/data-intelligence", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (deliveriesRes.ok) {
        const data = await deliveriesRes.json();
        const partnerDeliveries = data.deliveries.filter(
          (d: Delivery) => d.partnerId === organizationId
        );
        setDeliveries(partnerDeliveries);
      }

      // Load assigned locations
      const locationsRes = await fetch(`/api/v1/organizations/${organizationId}/locations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (locationsRes.ok) {
        const locData = await locationsRes.json();
        setAssignedLocations(locData.locations || []);
      } else {
        // Fallback: try to get locations from dashboard endpoint
        const dashboardRes = await fetch(`/api/v1/organizations/${organizationId}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (dashboardRes.ok) {
          const dashboardData = await dashboardRes.json();
          const locations = (dashboardData.data?.locations || []).map((loc: any) => ({
            id: loc.id,
            name: loc.name,
            address: loc.address || "",
            roomCounts: {
              bedroom: 0,
              bathroom: 0,
              kitchen: 0,
              livingArea: 0,
              other: 0,
            },
            taskCount: loc.taskCount || 0,
          }));
          setAssignedLocations(locations);
        }
      }

      // Load available locations (unassigned)
      const availableRes = await fetch("/api/v1/locations?unassigned=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (availableRes.ok) {
        const availData = await availableRes.json();
        setAvailableLocations(availData.locations || []);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load organization data");
    } finally {
      setLoading(false);
    }
  }, [user, organizationId, router]);

  useEffect(() => {
    if (user && organizationId) {
      loadData();
    }
  }, [user, organizationId, loadData]);

  async function handleUpdateOrganization(data: Partial<Organization>) {
    if (!user || !organization) return;

    if (!data.name?.trim()) {
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
          name: data.name?.trim(),
          contactName: data.contactName?.trim() || undefined,
          contactEmail: data.contactEmail?.trim() || undefined,
          contactPhone: data.contactPhone?.trim() || undefined,
          status: data.status || "active",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update organization");
      }

      toast.success("Organization updated successfully");
      setShowEditOrg(false);
      await loadData();
    } catch (error: any) {
      console.error("Failed to update organization:", error);
      toast.error(error.message || "Failed to update organization");
    }
  }

  async function handleDeleteOrganization() {
    if (!user || !organization) return;

    if (
      !confirm(
        `Delete "${organization.name}"? This will also affect all associated data. This cannot be undone.`
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
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Organization not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-white dark:bg-[#141414] border-b border-gray-200 dark:border-[#1f1f1f]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push("/admin/organizations")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#1f1f1f] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{organization.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    organization.status === "active"
                      ? "bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-400"
                      : "bg-gray-100 dark:bg-gray-500/20 text-gray-800 dark:text-gray-400"
                  }`}
                >
                  {organization.status}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {organization.partnerId ? "OEM Partner" : "Location Owner"}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 -mb-px">
            <TabButton
              active={activeTab === "overview"}
              onClick={() => handleTabChange("overview")}
              icon={<BarChart3 className="w-4 h-4" />}
            >
              Overview
            </TabButton>
            <TabButton
              active={activeTab === "deliveries"}
              onClick={() => handleTabChange("deliveries")}
              icon={<Package className="w-4 h-4" />}
              count={deliveries.length}
            >
              Deliveries
            </TabButton>
            <TabButton
              active={activeTab === "locations"}
              onClick={() => handleTabChange("locations")}
              icon={<MapPin className="w-4 h-4" />}
              count={assignedLocations.length}
            >
              Locations
            </TabButton>
            <TabButton
              active={activeTab === "api"}
              onClick={() => handleTabChange("api")}
              icon={<Key className="w-4 h-4" />}
            >
              API Access
            </TabButton>
            <TabButton
              active={activeTab === "settings"}
              onClick={() => handleTabChange("settings")}
              icon={<Settings className="w-4 h-4" />}
            >
              Settings
            </TabButton>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "overview" && (
          <OverviewTab
            organization={organization}
            deliveries={deliveries}
            assignedLocations={assignedLocations}
          />
        )}
        {activeTab === "deliveries" && (
          <DeliveriesTab
            deliveries={deliveries}
            organizationId={organizationId}
            organizationName={organization.name}
            onRefresh={loadData}
          />
        )}
        {activeTab === "locations" && (
          <LocationsTab
            assignedLocations={assignedLocations}
            availableLocations={availableLocations}
            organizationId={organizationId}
            organizationName={organization.name}
            onRefresh={loadData}
          />
        )}
        {activeTab === "api" && (
          <ApiAccessTab organization={organization} organizationId={organizationId} />
        )}
        {activeTab === "settings" && (
          <SettingsTab
            organization={organization}
            onUpdate={handleUpdateOrganization}
            onDelete={handleDeleteOrganization}
          />
        )}
      </div>
    </div>
  );
}

// Tab Button Component
function TabButton({
  active,
  onClick,
  children,
  icon,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${
        active
          ? "border-orange-500 text-orange-600 dark:text-orange-500"
          : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      }`}
    >
      {icon}
      {children}
      {count !== undefined && (
        <span
          className={`px-2 py-0.5 rounded-full text-xs ${
            active
              ? "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400"
              : "bg-gray-100 dark:bg-[#1f1f1f] text-gray-600 dark:text-gray-400"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// StatCard Helper Component
function StatCard({
  icon: Icon,
  label,
  value,
  small = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div
      className={`bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#1f1f1f] rounded-xl ${
        small ? "p-4" : "p-6"
      }`}
    >
      <div className={`flex items-center ${small ? "gap-2" : "gap-3"}`}>
        <div
          className={`${small ? "w-8 h-8" : "w-10 h-10"} rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center`}
        >
          <Icon className={`${small ? "w-4 h-4" : "w-5 h-5"} text-orange-500`} />
        </div>
        <div>
          <p className={`${small ? "text-lg" : "text-2xl"} font-bold text-gray-900 dark:text-white`}>
            {value}
          </p>
          <p className={`${small ? "text-xs" : "text-sm"} text-gray-500 dark:text-gray-400`}>{label}</p>
        </div>
      </div>
    </div>
  );
}

// OVERVIEW TAB
function OverviewTab({
  organization,
  deliveries,
  assignedLocations,
}: {
  organization: Organization;
  deliveries: Delivery[];
  assignedLocations: AssignedLocation[];
}) {
  // Calculate delivery stats
  const deliveryStats = useMemo(() => {
    const totalVideos = deliveries.reduce((sum, d) => sum + d.videoCount, 0);
    const totalStorageGB = deliveries.reduce((sum, d) => sum + d.sizeGB, 0);
    const totalHours = deliveries.reduce((sum, d) => sum + (d.hours || d.sizeGB / 15), 0);
    const dates = deliveries.map((d) => new Date(d.date).getTime()).filter(Boolean);

    return {
      totalVideos,
      totalStorageGB,
      totalHours,
      deliveryCount: deliveries.length,
      firstDelivery: dates.length > 0 ? new Date(Math.min(...dates)) : null,
      lastDelivery: dates.length > 0 ? new Date(Math.max(...dates)) : null,
    };
  }, [deliveries]);

  // Calculate location stats
  const locationStats = useMemo(() => {
    let bedrooms = 0,
      bathrooms = 0,
      kitchens = 0,
      livingAreas = 0,
      other = 0,
      totalTasks = 0;

    assignedLocations.forEach((loc) => {
      bedrooms += loc.roomCounts?.bedroom || 0;
      bathrooms += loc.roomCounts?.bathroom || 0;
      kitchens += loc.roomCounts?.kitchen || 0;
      livingAreas += loc.roomCounts?.livingArea || 0;
      other += loc.roomCounts?.other || 0;
      totalTasks += loc.taskCount || 0;
    });

    return {
      totalLocations: assignedLocations.length,
      totalRooms: bedrooms + bathrooms + kitchens + livingAreas + other,
      bedrooms,
      bathrooms,
      kitchens,
      livingAreas,
      other,
      totalTasks,
    };
  }, [assignedLocations]);

  // Chart data
  const chartData = useMemo(() => {
    if (deliveries.length < 2) return [];

    const sorted = [...deliveries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let runningTotal = 0;
    return sorted.map((d) => {
      runningTotal += d.videoCount;
      return {
        date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        total: runningTotal,
      };
    });
  }, [deliveries]);

  return (
    <div className="space-y-6">
      {/* Delivery Stats */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-500" />
          Data Delivered
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={Film}
            label="Videos Delivered"
            value={deliveryStats.totalVideos.toLocaleString()}
          />
          <StatCard
            icon={Clock}
            label="Hours of Footage"
            value={`${deliveryStats.totalHours.toFixed(1)} hrs`}
          />
          <StatCard
            icon={HardDrive}
            label="Total Storage"
            value={
              deliveryStats.totalStorageGB >= 1000
                ? `${(deliveryStats.totalStorageGB / 1000).toFixed(1)} TB`
                : `${deliveryStats.totalStorageGB.toFixed(1)} GB`
            }
          />
          <StatCard icon={Package} label="Total Deliveries" value={deliveryStats.deliveryCount.toString()} />
        </div>
      </div>

      {/* Delivery Trend Chart */}
      {chartData.length >= 2 && (
        <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#1f1f1f] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Delivery Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "#6b7280" }}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={{ stroke: "#e5e7eb" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--tooltip-bg, #fff)",
                  border: "1px solid var(--tooltip-border, #e5e7eb)",
                  borderRadius: "8px",
                }}
              />
              <Area type="monotone" dataKey="total" stroke="#f97316" fill="url(#colorTotal)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Location Access Stats */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-500" />
          Location Access
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard icon={Building2} label="Locations" value={locationStats.totalLocations.toString()} small />
          <StatCard icon={BedDouble} label="Bedrooms" value={locationStats.bedrooms.toString()} small />
          <StatCard icon={Bath} label="Bathrooms" value={locationStats.bathrooms.toString()} small />
          <StatCard icon={UtensilsCrossed} label="Kitchens" value={locationStats.kitchens.toString()} small />
          <StatCard icon={Sofa} label="Living Areas" value={locationStats.livingAreas.toString()} small />
          <StatCard icon={ClipboardList} label="Total Tasks" value={locationStats.totalTasks.toString()} small />
        </div>
      </div>

      {/* Recent Deliveries */}
      <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#1f1f1f] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Deliveries</h3>
        {deliveries.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No deliveries yet</p>
        ) : (
          <div className="space-y-3">
            {deliveries
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5)
              .map((delivery) => (
                <div
                  key={delivery.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {delivery.videoCount} videos • {delivery.sizeGB.toFixed(1)} GB
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{delivery.description}</p>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(delivery.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// DELIVERIES TAB
function DeliveriesTab({
  deliveries,
  organizationId,
  organizationName,
  onRefresh,
}: {
  deliveries: Delivery[];
  organizationId: string;
  organizationName: string;
  onRefresh: () => void;
}) {
  const { getIdToken } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDelivery, setNewDelivery] = useState({
    date: new Date().toISOString().split("T")[0],
    videoCount: "",
    sizeGB: "",
    hours: "",
    description: "",
  });

  const handleAddDelivery = async () => {
    if (!newDelivery.videoCount || !newDelivery.sizeGB || !newDelivery.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const token = await getIdToken();
      const hours = newDelivery.hours ? parseFloat(newDelivery.hours) : parseFloat(newDelivery.sizeGB) / 15;

      const response = await fetch("/api/admin/data-intelligence/deliveries", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: newDelivery.date,
          videoCount: parseInt(newDelivery.videoCount),
          sizeGB: parseFloat(newDelivery.sizeGB),
          hours,
          description: newDelivery.description.trim(),
          partnerId: organizationId,
          partnerName: organizationName,
        }),
      });

      if (response.ok) {
        toast.success("Delivery logged successfully");
        setShowAddForm(false);
        setNewDelivery({
          date: new Date().toISOString().split("T")[0],
          videoCount: "",
          sizeGB: "",
          hours: "",
          description: "",
        });
        onRefresh();
      } else {
        toast.error("Failed to add delivery");
      }
    } catch (error) {
      console.error("Failed to add delivery:", error);
      toast.error("Failed to add delivery");
    }
  };

  // Chart data
  const chartData = useMemo(() => {
    if (deliveries.length < 2) return [];

    const sorted = [...deliveries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let runningTotal = 0;
    return sorted.map((d) => {
      runningTotal += d.videoCount;
      return {
        date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        total: runningTotal,
      };
    });
  }, [deliveries]);

  // Summary stats
  const stats = useMemo(() => {
    const totalVideos = deliveries.reduce((sum, d) => sum + d.videoCount, 0);
    const totalSize = deliveries.reduce((sum, d) => sum + d.sizeGB, 0);
    const totalHours = deliveries.reduce((sum, d) => sum + (d.hours || d.sizeGB / 15), 0);
    return { totalVideos, totalSize, totalHours };
  }, [deliveries]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-500" />
          Delivery History
        </h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Log Delivery
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Film} label="Total Videos" value={stats.totalVideos.toLocaleString()} />
        <StatCard icon={Clock} label="Total Hours" value={`${stats.totalHours.toFixed(1)} hrs`} />
        <StatCard
          icon={HardDrive}
          label="Total Storage"
          value={
            stats.totalSize >= 1000
              ? `${(stats.totalSize / 1000).toFixed(1)} TB`
              : `${stats.totalSize.toFixed(1)} GB`
          }
        />
      </div>

      {/* Chart */}
      {chartData.length >= 2 && (
        <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#1f1f1f] rounded-xl p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cumulative Deliveries</h4>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="deliveryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "#6b7280" }}
                axisLine={{ stroke: "#374151" }}
              />
              <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={{ stroke: "#374151" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f1f1f",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  color: "#fff",
                }}
                formatter={(value: number) => [`${value} videos`, "Total"]}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#f97316"
                fill="url(#deliveryGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Add Delivery Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#1f1f1f] rounded-xl p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Log New Delivery</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
              <input
                type="date"
                value={newDelivery.date}
                onChange={(e) => setNewDelivery({ ...newDelivery, date: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#2a2a2a] rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Videos *</label>
              <input
                type="number"
                value={newDelivery.videoCount}
                onChange={(e) => setNewDelivery({ ...newDelivery, videoCount: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#2a2a2a] rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Size (GB) *</label>
              <input
                type="number"
                step="0.01"
                value={newDelivery.sizeGB}
                onChange={(e) => setNewDelivery({ ...newDelivery, sizeGB: e.target.value, hours: "" })}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#2a2a2a] rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hours</label>
              <input
                type="number"
                step="0.1"
                value={newDelivery.hours}
                onChange={(e) => setNewDelivery({ ...newDelivery, hours: e.target.value })}
                placeholder="Auto-calculated"
                className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#2a2a2a] rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description *
            </label>
            <input
              type="text"
              value={newDelivery.description}
              onChange={(e) => setNewDelivery({ ...newDelivery, description: e.target.value })}
              placeholder="e.g., Kitchen cleaning data batch 1"
              className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#2a2a2a] rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddDelivery}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Save Delivery
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-100 dark:bg-[#1f1f1f] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Deliveries Table */}
      <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#1f1f1f] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-[#1f1f1f]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Videos
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Hours
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Description
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-[#1f1f1f]">
            {deliveries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  No deliveries recorded yet
                </td>
              </tr>
            ) : (
              deliveries
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(delivery.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {delivery.videoCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {(delivery.hours || delivery.sizeGB / 15).toFixed(1)} hrs
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {delivery.sizeGB.toFixed(1)} GB
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{delivery.description}</td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// LOCATIONS TAB
function LocationsTab({
  assignedLocations,
  availableLocations,
  organizationId,
  organizationName,
  onRefresh,
}: {
  assignedLocations: AssignedLocation[];
  availableLocations: AssignedLocation[];
  organizationId: string;
  organizationName: string;
  onRefresh: () => void;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Calculate aggregate stats
  const stats = useMemo(() => {
    let bedrooms = 0,
      bathrooms = 0,
      kitchens = 0,
      livingAreas = 0,
      other = 0,
      totalTasks = 0;

    assignedLocations.forEach((loc) => {
      bedrooms += loc.roomCounts?.bedroom || 0;
      bathrooms += loc.roomCounts?.bathroom || 0;
      kitchens += loc.roomCounts?.kitchen || 0;
      livingAreas += loc.roomCounts?.livingArea || 0;
      other += loc.roomCounts?.other || 0;
      totalTasks += loc.taskCount || 0;
    });

    return {
      totalLocations: assignedLocations.length,
      totalRooms: bedrooms + bathrooms + kitchens + livingAreas + other,
      bedrooms,
      bathrooms,
      kitchens,
      livingAreas,
      other,
      totalTasks,
    };
  }, [assignedLocations]);

  const handleAssignLocation = async (locationId: string) => {
    if (!user) return;
    setAssigning(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/v1/locations/${locationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assignedOrganizationId: organizationId,
          assignedOrganizationName: organizationName,
        }),
      });

      if (response.ok) {
        toast.success("Location assigned successfully");
        setShowAssignModal(false);
        onRefresh();
      } else {
        toast.error("Failed to assign location");
      }
    } catch (error) {
      console.error("Failed to assign location:", error);
      toast.error("Failed to assign location");
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassignLocation = async (locationId: string, locationName: string) => {
    if (!user) return;
    if (!confirm(`Unassign "${locationName}" from "${organizationName}"?`)) return;

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

      if (response.ok) {
        toast.success("Location unassigned");
        onRefresh();
      } else {
        toast.error("Failed to unassign location");
      }
    } catch (error) {
      console.error("Failed to unassign location:", error);
      toast.error("Failed to unassign location");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-500" />
          Assigned Locations
        </h3>
        <button
          onClick={() => setShowAssignModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Assign Location
        </button>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <StatCard icon={Building2} label="Locations" value={stats.totalLocations.toString()} small />
        <StatCard icon={BedDouble} label="Bedrooms" value={stats.bedrooms.toString()} small />
        <StatCard icon={Bath} label="Bathrooms" value={stats.bathrooms.toString()} small />
        <StatCard icon={UtensilsCrossed} label="Kitchens" value={stats.kitchens.toString()} small />
        <StatCard icon={Sofa} label="Living Areas" value={stats.livingAreas.toString()} small />
        <StatCard icon={MapPin} label="Other Rooms" value={stats.other.toString()} small />
        <StatCard icon={ClipboardList} label="Total Tasks" value={stats.totalTasks.toString()} small />
      </div>

      {/* Locations Grid */}
      {assignedLocations.length === 0 ? (
        <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#1f1f1f] rounded-xl p-12 text-center">
          <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">No locations assigned to this organization</p>
          <button
            onClick={() => setShowAssignModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Assign First Location
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignedLocations.map((location) => (
            <div
              key={location.id}
              className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#1f1f1f] rounded-xl p-6 hover:shadow-md dark:hover:border-[#2a2a2a] transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{location.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{location.address}</p>
                </div>
                <button
                  onClick={() => handleUnassignLocation(location.id, location.name)}
                  className="text-sm text-orange-600 dark:text-orange-500 hover:text-orange-700 dark:hover:text-orange-400 font-medium"
                >
                  Unassign
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {(location.roomCounts?.bedroom || 0) +
                      (location.roomCounts?.bathroom || 0) +
                      (location.roomCounts?.kitchen || 0) +
                      (location.roomCounts?.livingArea || 0) +
                      (location.roomCounts?.other || 0)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Rooms</p>
                </div>
                <div className="text-center p-2 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{location.taskCount || 0}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tasks</p>
                </div>
                <div className="text-center p-2 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {location.totalSqFt ? `${location.totalSqFt.toLocaleString()}` : "—"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Sq Ft</p>
                </div>
              </div>

              <button
                onClick={() => router.push(`/admin/locations/${location.id}`)}
                className="w-full px-4 py-2 text-sm text-blue-600 dark:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                View Details
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Assign Location Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#1f1f1f] w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-[#1f1f1f]">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assign Location</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Select a location to assign to {organizationName}
              </p>
            </div>
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {availableLocations.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No unassigned locations available
                </p>
              ) : (
                <div className="space-y-3">
                  {availableLocations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => handleAssignLocation(location.id)}
                      disabled={assigning}
                      className="w-full p-4 text-left bg-gray-50 dark:bg-[#1a1a1a] hover:bg-gray-100 dark:hover:bg-[#1f1f1f] rounded-lg transition-colors disabled:opacity-50"
                    >
                      <p className="font-medium text-gray-900 dark:text-white">{location.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{location.address}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-[#1f1f1f]">
              <button
                onClick={() => setShowAssignModal(false)}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-[#1f1f1f] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// API ACCESS TAB
function ApiAccessTab({
  organization,
  organizationId,
}: {
  organization: Organization;
  organizationId: string;
}) {
  const [copied, setCopied] = useState(false);

  // Placeholder API key - in production, fetch from backend
  const apiKey = `sv_live_${organizationId.slice(0, 8)}...`;

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Key className="w-5 h-5 text-purple-500" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">API Access</h3>
      </div>

      {/* API Key Card */}
      <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#1f1f1f] rounded-xl p-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">API Key</h4>
        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg">
          <code className="flex-1 font-mono text-sm text-gray-900 dark:text-white">{apiKey}</code>
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-gray-200 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-gray-400" />}
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          Use this key to authenticate API requests for accessing training data.
        </p>
      </div>

      {/* API Documentation Link */}
      <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#1f1f1f] rounded-xl p-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Documentation</h4>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Learn how to integrate with the SuperVolcano API to access your training data programmatically.
        </p>
        <a
          href="/docs/api"
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          View API Documentation
        </a>
      </div>

      {/* Usage Stats Placeholder */}
      <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#1f1f1f] rounded-xl p-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">API Usage</h4>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">Usage statistics coming soon</p>
      </div>
    </div>
  );
}

// SETTINGS TAB
function SettingsTab({
  organization,
  onUpdate,
  onDelete,
}: {
  organization: Organization;
  onUpdate: (data: Partial<Organization>) => Promise<void>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: organization.name || "",
    contactName: organization.contactName || "",
    contactEmail: organization.contactEmail || "",
    contactPhone: organization.contactPhone || "",
    status: organization.status || "active",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(form);
      setEditing(false);
      toast.success("Organization updated");
    } catch (error) {
      toast.error("Failed to update organization");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-gray-500" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h3>
      </div>

      {/* Organization Info */}
      <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#1f1f1f] rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Organization Information</h4>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 text-sm text-blue-600 dark:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg font-medium transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Organization Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#2a2a2a] rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#2a2a2a] rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#2a2a2a] rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#2a2a2a] rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "inactive" })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#2a2a2a] rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-[#1f1f1f] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Organization Name</p>
              <p className="text-gray-900 dark:text-white font-medium">{organization.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
              <p className="text-gray-900 dark:text-white font-medium capitalize">{organization.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Contact Name</p>
              <p className="text-gray-900 dark:text-white font-medium">
                {organization.contactName || "Not set"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Contact Email</p>
              <p className="text-gray-900 dark:text-white font-medium">
                {organization.contactEmail || "Not set"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Contact Phone</p>
              <p className="text-gray-900 dark:text-white font-medium">
                {organization.contactPhone || "Not set"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-[#141414] border border-red-200 dark:border-red-500/30 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-red-600 dark:text-red-500 mb-4">Danger Zone</h4>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Deleting this organization will remove all associated data. This action cannot be undone.
        </p>
        <button
          onClick={onDelete}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete Organization
        </button>
      </div>
    </div>
  );
}
