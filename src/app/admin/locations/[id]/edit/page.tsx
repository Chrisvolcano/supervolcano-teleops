"use client";

/**
 * Edit Location Page
 */

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import type { Location, LocationType, LocationStatus } from "@/lib/types";
import type { Organization } from "@/lib/repositories/organizations";
import toast from "react-hot-toast";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

export default function EditLocationPage() {
  const router = useRouter();
  const params = useParams();
  const locationId = params.id as string;
  const { user, claims } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    type: "other" as LocationType,
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    partnerOrgId: "",
    assignedOrganizationId: "",
    assignedOrganizationName: "",
    accessInstructions: "",
    entryCode: "",
    parkingInfo: "",
    status: "active" as LocationStatus,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load location data
  useEffect(() => {
    async function loadLocation() {
      if (!user || !locationId) return;

      try {
        setLoading(true);
        const token = await user.getIdToken();
        const response = await fetch(`/api/v1/locations/${locationId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            toast.error("Location not found");
            router.push("/admin/locations");
            return;
          }
          throw new Error("Failed to load location");
        }

        const location: Location = await response.json();
        setFormData({
          name: location.name || "",
          address: location.address || "",
          type: location.type || "other",
          contactName: location.primaryContact?.name || "",
          contactPhone: location.primaryContact?.phone || "",
          contactEmail: location.primaryContact?.email || "",
          partnerOrgId: location.partnerOrgId || "",
          assignedOrganizationId: location.assignedOrganizationId || "",
          assignedOrganizationName: location.assignedOrganizationName || "",
          accessInstructions: location.accessInstructions || "",
          entryCode: location.entryCode || "",
          parkingInfo: location.parkingInfo || "",
          status: location.status || "active",
        });
      } catch (error) {
        console.error("Failed to load location:", error);
        toast.error("Failed to load location");
        router.push("/admin/locations");
      } finally {
        setLoading(false);
      }
    }

    if (user && locationId) {
      loadLocation();
    }
  }, [user, locationId, router]);

  // Load organizations for dropdown
  useEffect(() => {
    async function loadOrganizations() {
      if (!user) return;

      try {
        setLoadingOrganizations(true);
        const token = await user.getIdToken();
        const response = await fetch("/api/v1/organizations", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setOrganizations(data.organizations || []);
        }
      } catch (error) {
        console.error("Failed to load organizations:", error);
      } finally {
        setLoadingOrganizations(false);
      }
    }

    if (user && claims) {
      loadOrganizations();
    }
  }, [user, claims]);

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }
    if (!formData.partnerOrgId.trim()) {
      newErrors.partnerOrgId = "Partner Organization ID is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    try {
      setSaving(true);
      const token = await user.getIdToken();
      const response = await fetch(`/api/v1/locations/${locationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          address: formData.address.trim(),
          type: formData.type,
          primaryContact:
            formData.contactName || formData.contactPhone || formData.contactEmail
              ? {
                  name: formData.contactName || undefined,
                  phone: formData.contactPhone || undefined,
                  email: formData.contactEmail || undefined,
                }
              : undefined,
          partnerOrgId: formData.partnerOrgId.trim(),
          assignedOrganizationId: formData.assignedOrganizationId || undefined,
          assignedOrganizationName: formData.assignedOrganizationName || undefined,
          accessInstructions: formData.accessInstructions.trim() || undefined,
          entryCode: formData.entryCode.trim() || undefined,
          parkingInfo: formData.parkingInfo.trim() || undefined,
          status: formData.status,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update location");
      }

      toast.success("Location updated successfully");
      router.push(`/admin/locations/${locationId}`);
    } catch (error: any) {
      console.error("Failed to update location:", error);
      toast.error(error.message || "Failed to update location");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <p>Loading location...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/admin/locations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Locations
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold mb-2">Edit Location</CardTitle>
          <p className="text-gray-600">Update location information</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b pb-2">Basic Information</h2>

              <div>
                <Label htmlFor="name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="123 Main Street"
                  required
                />
                {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <Label htmlFor="address">
                  Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main St, City, State 12345"
                  required
                />
                {errors.address && <p className="text-sm text-red-500 mt-1">{errors.address}</p>}
              </div>

              <div>
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  className="w-full p-2 border rounded"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as LocationType })}
                >
                  <option value="home">Home</option>
                  <option value="office">Office</option>
                  <option value="warehouse">Warehouse</option>
                  <option value="retail">Retail</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <Label htmlFor="partnerOrgId">
                  Partner Organization ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="partnerOrgId"
                  value={formData.partnerOrgId}
                  onChange={(e) => setFormData({ ...formData, partnerOrgId: e.target.value })}
                  placeholder="demo-org"
                  required
                  disabled={claims?.role !== "superadmin"}
                />
                {errors.partnerOrgId && <p className="text-sm text-red-500 mt-1">{errors.partnerOrgId}</p>}
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b pb-2">Contact Information</h2>

              <div>
                <Label htmlFor="contactName">Contact Name</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="contact@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Assignment */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b pb-2">Organization Assignment</h2>

              <div>
                <Label htmlFor="assignedOrganizationId">Assign to Organization</Label>
                {loadingOrganizations ? (
                  <p className="text-sm text-gray-500">Loading organizations...</p>
                ) : (
                  <select
                    id="assignedOrganizationId"
                    className="w-full p-3 border rounded-lg"
                    value={formData.assignedOrganizationId}
                    onChange={(e) => {
                      const selectedOrg = organizations.find((org) => org.id === e.target.value);
                      setFormData({
                        ...formData,
                        assignedOrganizationId: e.target.value,
                        assignedOrganizationName: selectedOrg?.name || "",
                      });
                    }}
                  >
                    <option value="">Not assigned</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Access Instructions */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b pb-2">Access Instructions</h2>

              <div>
                <Label htmlFor="accessInstructions">Access Instructions</Label>
                <Textarea
                  id="accessInstructions"
                  value={formData.accessInstructions}
                  onChange={(e) => setFormData({ ...formData, accessInstructions: e.target.value })}
                  placeholder="Entry code, parking info, special instructions..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="entryCode">Entry Code</Label>
                  <Input
                    id="entryCode"
                    value={formData.entryCode}
                    onChange={(e) => setFormData({ ...formData, entryCode: e.target.value })}
                    placeholder="1234"
                  />
                </div>
                <div>
                  <Label htmlFor="parkingInfo">Parking Info</Label>
                  <Input
                    id="parkingInfo"
                    value={formData.parkingInfo}
                    onChange={(e) => setFormData({ ...formData, parkingInfo: e.target.value })}
                    placeholder="Park in rear lot"
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b pb-2">Status</h2>

              <div>
                <Label htmlFor="status">Location Status</Label>
                <select
                  id="status"
                  className="w-full p-3 border rounded-lg"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as LocationStatus })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-6 border-t">
              <Button type="submit" disabled={saving} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/admin/locations/${locationId}`)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

