"use client";

/**
 * Teleoperator Dashboard
 * Shows all assigned locations with task and instruction counts
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MapPin, LogOut, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import toast from "react-hot-toast";

interface LocationWithCounts {
  locationId: string;
  name: string;
  address: string;
  taskCount: number;
  instructionCount: number;
}

export default function TeleoperatorDashboardPage() {
  const router = useRouter();
  const { user, claims, logout } = useAuth();
  const [locations, setLocations] = useState<LocationWithCounts[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLocations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const token = await user.getIdToken();
      const response = await fetch("/api/v1/teleoperator/locations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          router.push("/no-access");
          return;
        }
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
  }, [user, router]);

  useEffect(() => {
    if (user && claims) {
      if (claims.role !== "oem_teleoperator") {
        router.push("/no-access");
        return;
      }
      loadLocations();
    }
  }, [user, claims, loadLocations, router]);

  const handleSignOut = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-gray-500">Loading locations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Welcome, {user?.displayName || "Teleoperator"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">My Assigned Locations</p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {locations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No Assigned Locations
              </h2>
              <p className="text-gray-500">
                You don&apos;t have any assigned locations yet. Contact your administrator.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                My Assigned Locations ({locations.length})
              </h2>
            </div>

            {/* Location Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locations.map((location) => (
                <Card
                  key={location.locationId}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/teleoperator/locations/${location.locationId}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                          {location.name}
                        </h3>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {location.address}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-gray-700">🎯</span>
                        <span className="text-gray-600">
                          {location.taskCount} task{location.taskCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-gray-700">📋</span>
                        <span className="text-gray-600">
                          {location.instructionCount} instruction
                          {location.instructionCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/teleoperator/locations/${location.locationId}`);
                      }}
                    >
                      View Location
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

