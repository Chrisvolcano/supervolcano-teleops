"use client";

/**
 * Admin Organizations Management Page
 * CRUD operations for organizations
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import type { Organization } from "@/lib/repositories/organizations";
import toast from "react-hot-toast";
import { Plus, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdminOrganizationsPage() {
  const router = useRouter();
  const { user, claims } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    status: "active" as "active" | "inactive",
    // Primary manager details
    managerEmail: "",
    managerDisplayName: "",
  });

  // Load organizations
  const loadOrganizations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const token = await user.getIdToken();
      const response = await fetch("/api/v1/organizations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load organizations");
      }

      const data = await response.json();
      setOrganizations(data.organizations || []);
    } catch (error) {
      console.error("Failed to load organizations:", error);
      toast.error("Failed to load organizations");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || !claims) return;

    loadOrganizations();
  }, [user, claims, loadOrganizations]);

  async function handleCreate() {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    // Validation
    if (!formData.name.trim()) {
      toast.error("Organization name is required");
      return;
    }

    if (!formData.managerEmail.trim() || !formData.managerDisplayName.trim()) {
      toast.error("Manager email and name are required");
      return;
    }

    try {
      setCreating(true);
      const token = await user.getIdToken();
      const response = await fetch("/api/v1/organizations", {
        method: "POST",
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
          partnerId: claims?.partnerId || "",
          // Manager details
          managerEmail: formData.managerEmail.trim(),
          managerDisplayName: formData.managerDisplayName.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create organization");
      }

      const result = await response.json();
      
      // Show success with password
      toast.success(
        (t) => (
          <div className="space-y-2">
            <p className="font-bold">✅ Organization created successfully!</p>
            <p className="text-sm">Manager: {formData.managerDisplayName}</p>
            <p className="text-sm">Email: {formData.managerEmail}</p>
            {result.password && (
              <>
                <p className="text-sm font-mono bg-yellow-100 p-2 rounded">
                  Temporary Password: {result.password}
                </p>
                <p className="text-xs text-gray-600">⚠️ Copy this password now - it won&apos;t be shown again!</p>
              </>
            )}
          </div>
        ),
        { duration: 15000 }
      );

      setShowCreateForm(false);
      setFormData({
        name: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        status: "active",
        managerEmail: "",
        managerDisplayName: "",
      });
      loadOrganizations();
    } catch (error: any) {
      console.error("Failed to create organization:", error);
      toast.error(error.message || "Failed to create organization");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(organizationId: string) {
    if (!confirm("Are you sure you want to delete this organization? This cannot be undone.")) {
      return;
    }

    if (!user) {
      toast.error("You must be logged in");
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

      toast.success("Organization deleted successfully");
      loadOrganizations();
    } catch (error: any) {
      console.error("Failed to delete organization:", error);
      toast.error(error.message || "Failed to delete organization");
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p>Loading organizations...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Organizations</h1>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Organization
        </Button>
      </div>

      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Organization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
            </div>

            {/* Primary Manager Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold border-b pb-2">Primary Organization Manager</h3>
              <p className="text-sm text-gray-600">
                The manager will have full access to view analytics, team performance, and all locations assigned to this organization.
              </p>

              <div>
                <Label htmlFor="managerEmail">
                  Manager Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="managerEmail"
                  type="email"
                  value={formData.managerEmail}
                  onChange={(e) => setFormData({ ...formData, managerEmail: e.target.value })}
                  placeholder="manager@acme.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="managerDisplayName">
                  Manager Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="managerDisplayName"
                  value={formData.managerDisplayName}
                  onChange={(e) => setFormData({ ...formData, managerDisplayName: e.target.value })}
                  placeholder="Sarah Johnson"
                  required
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>📝 Note:</strong> A temporary password will be generated and shown after creation. 
                  Copy it and send to the manager securely. They should change it on first login.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? "Creating..." : "Create Organization & Manager"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({
                    name: "",
                    contactName: "",
                    contactEmail: "",
                    contactPhone: "",
                    status: "active",
                    managerEmail: "",
                    managerDisplayName: "",
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {organizations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p>No organizations found. Create your first organization to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow
                    key={org.id}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => router.push(`/admin/organizations/${org.id}`)}
                  >
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell>
                      {org.contactName && <div>{org.contactName}</div>}
                      {org.contactEmail && (
                        <div className="text-sm text-gray-600">{org.contactEmail}</div>
                      )}
                      {org.contactPhone && (
                        <div className="text-sm text-gray-600">{org.contactPhone}</div>
                      )}
                      {!org.contactName && !org.contactEmail && !org.contactPhone && (
                        <span className="text-gray-400">No contact info</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={org.status === "active" ? "default" : "secondary"}>
                        {org.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/organizations/${org.id}`);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Details →
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

