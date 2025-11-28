/**
 * CREATE USER MODAL
 * Form to create new users with proper validation
 */

"use client";

import { useState } from "react";
import { X, Save, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { OrganizationDropdown } from "./OrganizationDropdown";
import { RoleDropdown } from "./RoleDropdown";
import type { UserRole } from "@/domain/user/user.types";

interface CreateUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateUserModal({ onClose, onSuccess }: CreateUserModalProps) {
  const { getIdToken } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: "",
    role: "" as UserRole | "",
    organizationId: "",
    teleoperatorId: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiresOrganization =
    formData.role === "partner_manager" ||
    formData.role === "oem_teleoperator" ||
    formData.role === "location_owner" ||
    formData.role === "location_cleaner";

  async function handleCreate() {
    setError(null);

    // Validation
    if (!formData.email || !formData.password || !formData.role) {
      setError("Email, password, and role are required");
      return;
    }

    if (requiresOrganization && !formData.organizationId) {
      setError("Organization ID is required for this role");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      setCreating(true);

      const token = await getIdToken(true);
      if (!token) throw new Error("Not authenticated");

      const response = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: {
          "x-firebase-token": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName || undefined,
          role: formData.role,
          organizationId: formData.organizationId || undefined,
          teleoperatorId: formData.teleoperatorId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      onSuccess();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl z-50 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Create New User</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Email */}
          <div>
            <Label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1.5">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="user@example.com"
            />
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1.5">
              Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Minimum 8 characters"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-1.5">
              Must be at least 8 characters
            </p>
          </div>

          {/* Display Name */}
          <div>
            <Label htmlFor="displayName" className="block text-sm font-medium text-neutral-700 mb-1.5">
              Display Name
            </Label>
            <Input
              id="displayName"
              type="text"
              value={formData.displayName}
              onChange={(e) =>
                setFormData({ ...formData, displayName: e.target.value })
              }
              placeholder="John Doe"
            />
          </div>

          {/* Role */}
          <RoleDropdown
            value={formData.role}
            onChange={(role) =>
              setFormData({ ...formData, role, organizationId: "" })
            }
            disabled={creating}
          />

          {/* Organization Dropdown */}
          <OrganizationDropdown
            role={formData.role}
            value={formData.organizationId}
            onChange={(value) =>
              setFormData({ ...formData, organizationId: value })
            }
            disabled={creating}
          />

          {/* Teleoperator ID (Optional for oem_teleoperator) */}
          {formData.role === "oem_teleoperator" && (
            <div>
              <Label htmlFor="teleoperatorId" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Teleoperator ID (Optional)
              </Label>
              <Input
                id="teleoperatorId"
                type="text"
                value={formData.teleoperatorId}
                onChange={(e) =>
                  setFormData({ ...formData, teleoperatorId: e.target.value })
                }
                placeholder="Optional identifier"
              />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div className="text-sm text-red-800">{error}</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex gap-3">
          <Button variant="outline" onClick={onClose} disabled={creating} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              creating ||
              !formData.email ||
              !formData.password ||
              !formData.role ||
              (requiresOrganization && !formData.organizationId)
            }
            className="flex-1 gap-2"
          >
            <Save className="w-4 h-4" />
            {creating ? "Creating..." : "Create User"}
          </Button>
        </div>
      </div>
    </>
  );
}

