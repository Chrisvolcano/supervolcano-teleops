"use client";

/**
 * Create New Location Page
 * Modern form with organization assignment
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import type { LocationType, LocationStatus } from "@/lib/types";
import type { Organization } from "@/lib/repositories/organizations";
import toast from "react-hot-toast";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

export default function NewLocationPage() {
  const router = useRouter();
  const { user, claims } = useAuth();
  const [loading, setLoading] = useState(false);
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
    partnerOrgId: (claims?.partnerId as string) || "",
    assignedOrganizationId: "",
    assignedOrganizationName: "",
    accessInstructions: "",
    entryCode: "",
    parkingInfo: "",
    status: "active" as LocationStatus,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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
    if (!formData.partnerOrgId || (typeof formData.partnerOrgId === 'string' && !formData.partnerOrgId.trim())) {
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
      setLoading(true);
      const token = await user.getIdToken();
      const response = await fetch("/api/v1/locations", {
        method: "POST",
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
          partnerOrgId: typeof formData.partnerOrgId === 'string' ? formData.partnerOrgId.trim() : '',
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
        throw new Error(error.error || "Failed to create location");
      }

      const data = await response.json();
      toast.success(`Location created: ${data.locationId}`);
      router.push("/admin/locations");
    } catch (error: any) {
      console.error("Failed to create location:", error);
      toast.error(error.message || "Failed to create location");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
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
          <CardTitle className="text-3xl font-bold mb-2">Create Location</CardTitle>
          <p className="text-gray-600">Add a new location to the system</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b pb-2">Basic Information</h2>

              <div>
                <Label htmlFor="name">
                  Location Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Downtown Office Building"
                  required
                />
                {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <Label htmlFor="address">
                  Address <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main St, San Francisco, CA 94102"
                  rows={2}
                  required
                />
                {errors.address && <p className="text-sm text-red-500 mt-1">{errors.address}</p>}
              </div>

              <div>
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  className="w-full p-2 border rounded-lg"
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

            {/* Organization Assignment */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b pb-2">Organization Assignment</h2>

              <div>
                <Label htmlFor="assignedOrganizationId">Assign to Organization (optional)</Label>
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
                <p className="text-sm text-gray-500 mt-1">
                  Assign this location to an organization. All teleoperators in that organization will have access.
                </p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b pb-2">Contact Information</h2>

              <div>
                <Label htmlFor="contactName">Contact Name</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  placeholder="John Smith"
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
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
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
                  placeholder="Entry code: 1234. Parking in rear. Check in at front desk."
                  rows={4}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Instructions for teleoperators on how to access this location
                </p>
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
              <Button type="submit" disabled={loading} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Creating..." : "Create Location"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/admin/locations")} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
