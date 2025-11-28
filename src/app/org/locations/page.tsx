"use client";

/**
 * Organization Locations List Page
 * Shows all locations assigned to the user's organization
 */

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonGrid } from "@/components/ui/SkeletonCard";
import toast from "react-hot-toast";

export default function OrgLocationsPage() {
  const router = useRouter();
  const { user, claims, getIdToken } = useAuth();
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize sorted locations to avoid re-sorting on every render
  const sortedLocations = useMemo(() => {
    return [...locations].sort((a, b) => a.name.localeCompare(b.name));
  }, [locations]);

  useEffect(() => {
    async function loadData() {
      if (!user || !claims || !claims.organizationId) {
        setLoading(false);
        return;
      }

      setError(null);
      try {
        const token = await getIdToken();
        if (!token) return;

        // Fetch locations for this organization
        const response = await fetch("/api/v1/locations", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Filter to only show locations assigned to this organization
          const orgLocations = (data.locations || []).filter(
            (loc: any) => loc.assignedOrganizationId === claims.organizationId,
          );
          setLocations(orgLocations);
        } else {
          throw new Error(`Failed to load locations (${response.status})`);
        }
      } catch (error: any) {
        console.error("Failed to load locations:", error);
        setError(error.message || "Failed to load locations");
        toast.error("Failed to load locations. Please try again.");
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
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Locations</h1>
        <SkeletonGrid count={6} columns={3} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Locations</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6" role="alert">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">⚠️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-1">Error Loading Locations</h3>
              <p className="text-sm text-red-700 mb-3">{error}</p>
              <button
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  // Trigger reload
                  window.location.reload();
                }}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
                aria-label="Retry loading locations"
              >
                Try Again →
              </button>
            </div>
          </div>
        </div>
      )}

      {sortedLocations.length === 0 && !error ? (
        <EmptyState
          icon="📍"
          title="No Locations Yet"
          description="Your organization doesn't have any assigned locations yet. Contact your administrator to get started."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {sortedLocations.map((location) => (
            <Card
              key={location.locationId}
              className="cursor-pointer hover:shadow-lg transition"
              onClick={() => router.push(`/org/locations/${location.locationId}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  router.push(`/org/locations/${location.locationId}`);
                }
              }}
              aria-label={`View location ${location.name}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-2xl">📍</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{location.name}</h3>
                    <p className="text-sm text-gray-600">{location.address}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tasks:</span>
                    <span className="font-medium">{location.taskCount || 0}</span>
                  </div>
                </div>

                <button
                  className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/org/locations/${location.locationId}`);
                  }}
                  aria-label={`View details for ${location.name}`}
                >
                  View Location
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

