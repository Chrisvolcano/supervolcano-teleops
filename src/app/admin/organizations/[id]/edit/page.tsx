"use client";

/**
 * Edit Organization Page
 */

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import type { Organization } from "@/lib/repositories/organizations";
import toast from "react-hot-toast";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function EditOrganizationPage() {
  const router = useRouter();
  const params = useParams();
  const organizationId = params.id as string;
  const { user, claims } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    status: "active" as "active" | "inactive",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load organization data
  useEffect(() => {
    async function loadOrganization() {
      if (!user || !organizationId) return;

      try {
        setLoading(true);
        const token = await user.getIdToken();
        const response = await fetch(`/api/v1/organizations/${organizationId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            toast.error("Organization not found");
            router.push("/admin/organizations");
            return;
          }
          throw new Error("Failed to load organization");
        }

        const data = await response.json();
        const organization: Organization = data.organization;
        
        setFormData({
          name: organization.name || "",
          contactName: organization.contactName || "",
          contactEmail: organization.contactEmail || "",
          contactPhone: organization.contactPhone || "",
          status: organization.status || "active",
        });
      } catch (error) {
        console.error("Failed to load organization:", error);
        toast.error("Failed to load organization");
        router.push("/admin/organizations");
      } finally {
        setLoading(false);
      }
    }

    if (user && organizationId) {
      loadOrganization();
    }
  }, [user, organizationId, router]);

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Organization name is required";
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
      const response = await fetch(`/api/v1/organizations/${organizationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          contactName: formData.contactName.trim() || undefined,
          contactEmail: formData.contactEmail.trim() || undefined,
          contactPhone: formData.contactPhone.trim() || undefined,
          status: formData.status,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update organization");
      }

      toast.success("Organization updated successfully");
      router.push("/admin/organizations");
    } catch (error: any) {
      console.error("Failed to update organization:", error);
      toast.error(error.message || "Failed to update organization");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <p>Loading organization...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/admin/organizations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Organizations
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">
                Organization Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="1x Technologies"
                required
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactName">Contact Name</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  placeholder="John Doe"
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
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="w-full p-2 border rounded"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as "active" | "inactive" })
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/admin/organizations")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}




