"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Save, AlertCircle, RefreshCw } from "lucide-react";
import { useUserUpdate } from "@/hooks/useUserUpdate";
import { UserValidator } from "@/domain/user/user.validation";
import { UsersServiceError } from "@/services/users.service";
import { OrganizationDropdown } from "./OrganizationDropdown";
import { RoleDropdown } from "./RoleDropdown";
import type { User, UserRole, UserUpdateRequest } from "@/domain/user/user.types";

interface UserEditDrawerProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

type SyncStrategy = "both" | "auth" | "firestore";

interface FormState {
  displayName: string;
  role: UserRole | "";
  organizationId: string;
}

export function UserEditDrawer({
  user,
  onClose,
  onSuccess,
}: UserEditDrawerProps) {
  // Form state
  const [formData, setFormData] = useState<FormState>({
    displayName: user.displayName || user.firestore?.displayName || "",
    role: (user.auth.role || user.firestore?.role || "") as UserRole | "",
    organizationId:
      user.auth.organizationId || user.firestore?.organizationId || "",
  });

  const [syncStrategy, setSyncStrategy] = useState<SyncStrategy>("both");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Service hook
  const { updateUser, isLoading, isError, error, reset } = useUserUpdate(() => {
    onSuccess();
    onClose();
  });

  // Track unsaved changes
  useEffect(() => {
    const hasChanges =
      formData.displayName !==
        (user.displayName || user.firestore?.displayName || "") ||
      formData.role !== (user.auth.role || user.firestore?.role || "") ||
      formData.organizationId !==
        (user.auth.organizationId || user.firestore?.organizationId || "");

    setHasUnsavedChanges(hasChanges);
  }, [formData, user]);

  // Warn before closing with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Validate form on change
  useEffect(() => {
    const validation = UserValidator.validateUserUpdate(formData);
    setValidationErrors(validation.errors);
  }, [formData]);

  // Keyboard shortcut: Cmd/Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (canSave) {
          handleSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [formData, syncStrategy]); // eslint-disable-line react-hooks/exhaustive-deps

  const canSave =
    validationErrors.length === 0 &&
    !isLoading &&
    formData.role !== "" &&
    hasUnsavedChanges;

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to close?",
      );
      if (!confirmed) return;
    }

    reset();
    onClose();
  }, [hasUnsavedChanges, onClose, reset]);

  async function handleSave() {
    if (!canSave) return;

    const updates: UserUpdateRequest = {
      displayName: formData.displayName || undefined,
      role: formData.role as UserRole,
      organizationId: formData.organizationId || undefined,
      syncToAuth: syncStrategy === "both" || syncStrategy === "auth",
      syncToFirestore: syncStrategy === "both" || syncStrategy === "firestore",
    };

    try {
      await updateUser(user.uid, updates);
    } catch (err) {
      // Error handled by hook
    }
  }

  // User-friendly error messages
  const getErrorMessage = (err: UsersServiceError | null) => {
    if (!err) return "";

    switch (err.code) {
      case "AUTH_ERROR":
        return err.message;
      case "NETWORK_ERROR":
        return "Network error. Please check your connection and try again.";
      case "VALIDATION_ERROR":
        return err.message;
      case "SERVER_ERROR":
        if (err.statusCode === 500) {
          return "Server error. Please try again in a moment.";
        }
        return err.message;
      default:
        return "An unexpected error occurred. Please try again.";
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Edit User</h2>
            <p className="text-sm text-gray-600 mt-0.5">{user.email}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Sync Status Alert */}
          {user.syncStatus !== "synced" && (
            <div
              className="bg-amber-50 border border-amber-200 rounded-lg p-4"
              role="alert"
            >
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-amber-900 text-sm mb-1">
                    Sync Issue Detected
                  </div>
                  <ul className="text-sm text-amber-800 space-y-1">
                    {user.syncIssues.map((issue, i) => (
                      <li key={i}>• {issue}</li>
                    ))}
                  </ul>
                  <p className="text-sm text-amber-700 mt-2 font-medium">
                    {`💡 Click "Save Changes" below to automatically fix this`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            {/* Display Name */}
            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={formData.displayName}
                onChange={(e) =>
                  setFormData({ ...formData, displayName: e.target.value })
                }
                placeholder="Enter display name"
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
              />
            </div>

            {/* Role */}
            <RoleDropdown
              value={formData.role}
              onChange={(role) =>
                setFormData({ ...formData, role, organizationId: "" })
              }
              disabled={isLoading}
            />

            {/* Organization Dropdown */}
            <OrganizationDropdown
              role={formData.role}
              value={formData.organizationId}
              onChange={(value) =>
                setFormData({ ...formData, organizationId: value })
              }
              disabled={isLoading}
            />
          </form>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div
              className="bg-red-50 border border-red-200 rounded-lg p-4"
              role="alert"
            >
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-red-900 text-sm mb-1">
                    Please fix the following errors:
                  </div>
                  <ul className="text-sm text-red-800 space-y-1">
                    {validationErrors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Save Error */}
          {isError && error && (
            <div
              className="bg-red-50 border border-red-200 rounded-lg p-4"
              role="alert"
            >
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-red-900 text-sm mb-1">
                    Save Failed
                  </div>
                  <p className="text-sm text-red-800">
                    {getErrorMessage(error)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sync Strategy */}
          <fieldset className="border-t pt-6">
            <legend className="block text-sm font-medium text-gray-700 mb-3">
              Sync Strategy
            </legend>
            <div className="space-y-2">
              {[
                {
                  value: "both" as const,
                  label: "Sync to Both (Recommended)",
                  description: "Update Firebase Auth AND Firestore",
                },
                {
                  value: "auth" as const,
                  label: "Auth Only",
                  description: "Only update Firebase Auth custom claims",
                },
                {
                  value: "firestore" as const,
                  label: "Firestore Only",
                  description: "Only update Firestore document",
                },
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="radio"
                    name="syncStrategy"
                    value={option.value}
                    checked={syncStrategy === option.value}
                    onChange={() => setSyncStrategy(option.value)}
                    disabled={isLoading}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900">
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {option.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Current State */}
          <details className="border-t pt-6">
            <summary className="text-sm font-medium text-gray-700 cursor-pointer select-none">
              Current State Comparison
            </summary>
            <div className="mt-3 bg-gray-50 rounded-lg p-4 space-y-2 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-600">Auth Role:</div>
                <div className="font-semibold text-gray-900">
                  {user.auth.role || "—"}
                </div>
                <div className="text-gray-600">Firestore Role:</div>
                <div className="font-semibold text-gray-900">
                  {user.firestore?.role || "—"}
                </div>
              </div>
              <div className="border-t border-gray-300 my-2" />
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-600">Auth Org:</div>
                <div className="font-semibold text-gray-900 break-all text-[10px]">
                  {user.auth.organizationId || "—"}
                </div>
                <div className="text-gray-600">Firestore Org:</div>
                <div className="font-semibold text-gray-900 break-all text-[10px]">
                  {user.firestore?.organizationId || "—"}
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50 flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 border border-gray-300 bg-white rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            title={
              !canSave
                ? validationErrors.length > 0
                  ? "Cannot save: Please fix validation errors first"
                  : "Saving in progress..."
                : "Save changes (Cmd+S or Ctrl+S)"
            }
            aria-label={
              !canSave
                ? validationErrors.length > 0
                  ? "Save button disabled: Validation errors present"
                  : "Save button disabled: Saving in progress"
                : "Save user changes"
            }
            aria-disabled={!canSave}
          >
            {isLoading ? (
              <>
                <RefreshCw
                  className="w-4 h-4 animate-spin"
                  aria-hidden="true"
                />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" aria-hidden="true" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
