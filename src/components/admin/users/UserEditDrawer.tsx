/**
 * USER EDIT DRAWER
 * Slide-out panel for editing user details (better UX than modal)
 */

"use client";

import { useState, useEffect } from "react";
import { X, Save, AlertCircle, RefreshCw, CheckCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useUserUpdate } from "@/hooks/useUserUpdate";
import { useAuth } from "@/hooks/useAuth";
import { usersService } from "@/services/users.service";
import type { User, UserRole, UserUpdateRequest } from "@/domain/user/user.types";

interface UserEditDrawerProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

export function UserEditDrawer({
  user,
  onClose,
  onSuccess,
}: UserEditDrawerProps) {
  const { getIdToken } = useAuth();
  const { updating, error, updateUser } = useUserUpdate(onSuccess);

  const [formData, setFormData] = useState({
    displayName:
      user.displayName || user.firestore?.displayName || "",
    role: (user.auth.role ||
      user.firestore?.role ||
      "") as UserRole | "",
    organizationId:
      user.auth.organizationId || user.firestore?.organizationId || "",
    teleoperatorId:
      user.auth.teleoperatorId || user.firestore?.teleoperatorId || "",
  });

  const [syncStrategy, setSyncStrategy] = useState<
    "both" | "auth" | "firestore"
  >("both");
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const changed =
      formData.displayName !==
        (user.displayName || user.firestore?.displayName || "") ||
      formData.role !== (user.auth.role || user.firestore?.role || "") ||
      formData.organizationId !==
        (user.auth.organizationId || user.firestore?.organizationId || "") ||
      formData.teleoperatorId !==
        (user.auth.teleoperatorId || user.firestore?.teleoperatorId || "");
    setHasChanges(changed);
  }, [formData, user]);

  async function handleSave() {
    if (!formData.role) {
      alert("Role is required");
      return;
    }

    const updates: UserUpdateRequest = {
      displayName: formData.displayName || undefined,
      role: formData.role as UserRole,
      organizationId: formData.organizationId || undefined,
      teleoperatorId: formData.teleoperatorId || undefined,
      syncToAuth: syncStrategy === "both" || syncStrategy === "auth",
      syncToFirestore:
        syncStrategy === "both" || syncStrategy === "firestore",
    };

    try {
      await updateUser(user.uid, updates);
    } catch (err) {
      // Error is handled by hook
    }
  }

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit User</SheetTitle>
          <SheetDescription>{user.email}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-6">
          {/* Sync Status Warning */}
          {user.syncStatus !== "synced" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-semibold text-yellow-900 mb-1">
                    Sync Issue Detected
                  </div>
                  <div className="text-yellow-800 space-y-1">
                    {user.syncIssues.map((issue, i) => (
                      <div key={i}>• {issue}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
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
                placeholder="Enter display name"
              />
            </div>

            {/* Role */}
            <div>
              <Label htmlFor="role" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Role <span className="text-red-500">*</span>
              </Label>
              <Select
                id="role"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value as UserRole })
                }
              >
                <option value="">Select role</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
                <option value="org_manager">Organization Manager</option>
                <option value="partner_manager">Partner Manager</option>
                <option value="partner_admin">Partner Admin</option>
                <option value="field_operator">Field Operator</option>
                <option value="teleoperator">Teleoperator</option>
              </Select>
              <p className="text-xs text-neutral-500 mt-1.5">
                Determines access level and permissions
              </p>
            </div>

            {/* Organization ID */}
            <div>
              <Label htmlFor="organizationId" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Organization ID
              </Label>
              <Input
                id="organizationId"
                type="text"
                value={formData.organizationId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    organizationId: e.target.value,
                  })
                }
                placeholder="e.g., 9a5f4710-9b1a-457c-b734-c3aed71a860a"
                className="font-mono text-sm"
              />
              <p className="text-xs text-neutral-500 mt-1.5">
                Required for org_manager and field_operator roles
              </p>
            </div>

            {/* Teleoperator ID */}
            <div>
              <Label htmlFor="teleoperatorId" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Teleoperator ID
              </Label>
              <Input
                id="teleoperatorId"
                type="text"
                value={formData.teleoperatorId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    teleoperatorId: e.target.value,
                  })
                }
                placeholder="Optional"
                className="font-mono text-sm"
              />
            </div>
          </div>

          {/* Sync Strategy */}
          <div className="border-t pt-6">
            <Label className="block text-sm font-medium text-neutral-700 mb-3">
              Sync Strategy
            </Label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
                <input
                  type="radio"
                  name="syncStrategy"
                  value="both"
                  checked={syncStrategy === "both"}
                  onChange={() => setSyncStrategy("both")}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    Sync to Both (Recommended)
                  </div>
                  <div className="text-xs text-neutral-600 mt-0.5">
                    Update Firebase Auth custom claims AND Firestore document
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
                <input
                  type="radio"
                  name="syncStrategy"
                  value="auth"
                  checked={syncStrategy === "auth"}
                  onChange={() => setSyncStrategy("auth")}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">Auth Only</div>
                  <div className="text-xs text-neutral-600 mt-0.5">
                    Only update Firebase Auth custom claims
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
                <input
                  type="radio"
                  name="syncStrategy"
                  value="firestore"
                  checked={syncStrategy === "firestore"}
                  onChange={() => setSyncStrategy("firestore")}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">Firestore Only</div>
                  <div className="text-xs text-neutral-600 mt-0.5">
                    Only update Firestore document
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Current State Comparison */}
          <div className="border-t pt-6">
            <div className="text-sm font-medium text-neutral-700 mb-3">
              Current State
            </div>
            <div className="bg-neutral-50 rounded-lg p-4 space-y-3">
              <StateComparison
                label="Role"
                authValue={user.auth.role}
                firestoreValue={user.firestore?.role}
              />
              <StateComparison
                label="Organization ID"
                authValue={user.auth.organizationId}
                firestoreValue={user.firestore?.organizationId}
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div className="text-sm text-red-800">{error.message}</div>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={updating}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updating || !hasChanges || !formData.role}
            className="gap-2"
          >
            {updating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// State Comparison Component
function StateComparison({
  label,
  authValue,
  firestoreValue,
}: {
  label: string;
  authValue?: string;
  firestoreValue?: string;
}) {
  const isMatch = authValue === firestoreValue;
  const Icon = isMatch ? CheckCircle : AlertCircle;
  const iconColor = isMatch ? "text-green-600" : "text-yellow-600";

  return (
    <div className="flex items-start justify-between text-xs">
      <div className="font-medium text-neutral-700">{label}:</div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <div className="text-neutral-600">Auth: {authValue || "—"}</div>
          <div className="text-neutral-600">
            Firestore: {firestoreValue || "—"}
          </div>
        </div>
        <Icon className={`w-4 h-4 ${iconColor} flex-shrink-0`} />
      </div>
    </div>
  );
}
