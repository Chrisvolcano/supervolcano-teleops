"use client";

/**
 * Admin Locations Management Page
 * List all locations with modern dashboard-style UI
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import type { Location } from "@/lib/types";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type StatCardProps = {
  title: string;
  value: number;
  icon: string;
  color: "blue" | "green" | "orange";
  onClick: () => void;
  active: boolean;
};

function StatCard({ title, value, icon, color, onClick, active }: StatCardProps) {
  const colorClasses = {
    blue: active ? "bg-blue-100 border-blue-300" : "bg-blue-50 border-blue-200",
    green: active ? "bg-green-100 border-green-300" : "bg-green-50 border-green-200",
    orange: active ? "bg-orange-100 border-orange-300" : "bg-orange-50 border-orange-200",
  };

  return (
    <div
      onClick={onClick}
      className={`border-2 rounded-lg p-6 cursor-pointer transition hover:shadow-md ${colorClasses[color]}`}
    >
      <div className="flex items-center gap-4">
        <div className="text-4xl">{icon}</div>
        <div>
          <div className="text-3xl font-bold">{value}</div>
          <div className="text-sm font-medium text-gray-700">{title}</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLocationsPage() {
  const router = useRouter();
  const { user, claims } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "assigned" | "unassigned">("all");

  // Load locations
  const loadLocations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const token = await user.getIdToken();
      const response = await fetch("/api/v1/locations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load locations");
      }

      const data = await response.json();
      setLocations(data.locations || []);
    } catch (error) {
      console.error("Failed to load locations:", error);
      toast.error("Failed to load locations");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load organizations for display names
  const loadOrganizations = useCallback(async () => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/v1/organizations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrganizations(
          (data.organizations || []).map((org: any) => ({
            id: org.id,
            name: org.name,
          })),
        );
      }
    } catch (error) {
      console.error("Failed to load organizations:", error);
    }
  }, [user]);

  useEffect(() => {
    if (!user || !claims) return;

    loadLocations();
    loadOrganizations();
  }, [user, claims, loadLocations, loadOrganizations]);

  // Get organization name by ID
  function getOrganizationName(organizationId: string | undefined, assignedName?: string): string {
    if (!organizationId) return "Not Assigned";
    const organization = organizations.find((org) => org.id === organizationId);
    return organization?.name || assignedName || "Unknown";
  }

  // Calculate stats
  const stats = {
    total: locations.length,
    assigned: locations.filter((l) => l.assignedOrganizationId).length,
    unassigned: locations.filter((l) => !l.assignedOrganizationId).length,
  };

  // Filter locations
  const filteredLocations = locations.filter((loc) => {
    if (filter === "assigned") return loc.assignedOrganizationId;
    if (filter === "unassigned") return !loc.assignedOrganizationId;
    return true;
  });

  // Get task count for location
  function getTaskCount(location: Location & { taskCount?: number }): number {
    return location.taskCount || 0;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Locations</h1>
          <p className="text-gray-600">Manage locations and assign to organizations</p>
        </div>
        <Button onClick={() => router.push("/admin/locations/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Create Location
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard
          title="Total Locations"
          value={stats.total}
          icon="📍"
          color="blue"
          onClick={() => setFilter("all")}
          active={filter === "all"}
        />
        <StatCard
          title="Assigned"
          value={stats.assigned}
          icon="✅"
          color="green"
          onClick={() => setFilter("assigned")}
          active={filter === "assigned"}
        />
        <StatCard
          title="Unassigned"
          value={stats.unassigned}
          icon="⚠️"
          color="orange"
          onClick={() => setFilter("unassigned")}
          active={filter === "unassigned"}
        />
      </div>

      {/* Locations Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-semibold">Location</th>
                  <th className="text-left p-4 font-semibold">Address</th>
                  <th className="text-left p-4 font-semibold">Assigned Organization</th>
                  <th className="text-left p-4 font-semibold">Tasks</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-left p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      {filter === "all"
                        ? "No locations yet. Create one to get started."
                        : filter === "assigned"
                          ? "No assigned locations."
                          : "No unassigned locations."}
                    </td>
                  </tr>
                ) : (
                  filteredLocations.map((location) => (
                    <tr
                      key={location.locationId}
                      className="border-b hover:bg-gray-50 cursor-pointer transition"
                      onClick={() => router.push(`/admin/locations/${location.locationId}`)}
                    >
                      <td className="p-4">
                        <div className="font-medium text-gray-900">{location.name}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-gray-600">{location.address}</div>
                      </td>
                      <td className="p-4">
                        {location.assignedOrganizationId ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-blue-100 text-blue-800">
                              {location.assignedOrganizationName ||
                                getOrganizationName(location.assignedOrganizationId, location.assignedOrganizationName)}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Not assigned</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-gray-600">{getTaskCount(location)} tasks</span>
                      </td>
                      <td className="p-4">
                        <Badge variant={location.status === "active" ? "default" : "secondary"}>
                          {location.status}
                        </Badge>
                      </td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/locations/${location.locationId}`);
                          }}
                        >
                          View Details →
                        </Button>
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
