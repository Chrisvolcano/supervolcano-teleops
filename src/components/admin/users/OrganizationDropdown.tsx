/**
 * ORGANIZATION DROPDOWN
 * Role-aware organization selector with dynamic options
 */

"use client";

import { useEffect } from "react";
import { useOrganizations } from "@/hooks/useOrganizations";
import { getOrganizationTypeForRole } from "@/types/organization.types";
import type { OrganizationType } from "@/types/organization.types";
import type { UserRole } from "@/domain/user/user.types";

interface OrganizationDropdownProps {
  role: UserRole | "";
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onCreateNew?: (type: OrganizationType) => void;
}

export function OrganizationDropdown({
  role,
  value,
  onChange,
  disabled,
  onCreateNew,
}: OrganizationDropdownProps) {
  // Get required organization type for selected role
  const organizationType = role
    ? getOrganizationTypeForRole(role)
    : null;

  const { organizations, loading, error } = useOrganizations(
    organizationType || undefined,
  );

  // Auto-select SuperVolcano for admin roles
  useEffect(() => {
    if ((role === "admin" || role === "superadmin") && !value) {
      onChange("sv:internal");
    }
  }, [role, value, onChange]);

  // Admins are always SuperVolcano - show read-only field
  if (role === "admin" || role === "superadmin") {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Organization
        </label>
        <input
          type="text"
          value="SuperVolcano Internal"
          disabled
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
        />
        <p className="text-xs text-gray-500 mt-1.5">
          Admins belong to SuperVolcano
        </p>
      </div>
    );
  }

  // No role selected yet - show nothing
  if (!role || !organizationType) {
    return null;
  }

  // Show dropdown for roles that need org selection
  return (
    <div>
      <label
        htmlFor="organizationId"
        className="block text-sm font-medium text-gray-700 mb-1.5"
      >
        Organization{" "}
        <span className="text-red-500" aria-label="required">
          *
        </span>
      </label>

      {loading ? (
        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 animate-pulse">
          Loading organizations...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">Error: {error}</p>
        </div>
      ) : organizations.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            No organizations found. Create one first or contact an admin.
          </p>
        </div>
      ) : (
        <>
          <select
            id="organizationId"
            value={value}
            onChange={(e) => {
              if (e.target.value === "__create_new__" && onCreateNew) {
                onCreateNew(organizationType);
              } else {
                onChange(e.target.value);
              }
            }}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
            aria-required="true"
          >
            <option value="">Select organization</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
            {onCreateNew && (
              <option value="__create_new__">+ Create New Organization</option>
            )}
          </select>

          <p className="text-xs text-gray-500 mt-1.5">
            {organizationType === "oem_partner" &&
              "Select the robotics company this user works for"}
            {organizationType === "location_owner" &&
              "Select the property owner this user works for"}
          </p>
        </>
      )}
    </div>
  );
}
