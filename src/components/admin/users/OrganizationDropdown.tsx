/**
 * ORGANIZATION DROPDOWN
 * Role-aware organization selector with dynamic options
 */

"use client";

import { useState, useEffect } from "react";
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
  const [showFieldOperatorType, setShowFieldOperatorType] = useState(false);
  const [fieldOperatorType, setFieldOperatorType] = useState<"oem" | "owner">(
    "oem",
  );

  // Determine which organization type to show based on role
  let organizationType: OrganizationType | null =
    getOrganizationTypeForRole(role);

  // For field operators, we need to ask what type they are
  if (role === "field_operator") {
    organizationType =
      fieldOperatorType === "oem" ? "oem_partner" : "location_owner";
  }

  const { organizations, loading, error } = useOrganizations(
    organizationType || undefined,
  );

  // Auto-select SuperVolcano for admin roles
  useEffect(() => {
    if ((role === "admin" || role === "superadmin") && !value) {
      onChange("sv:internal");
    }
  }, [role, value, onChange]);

  // Show field operator type selector
  if (role === "field_operator" && !showFieldOperatorType && !value) {
    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Field Operator Type <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="fieldOperatorType"
              value="oem"
              checked={fieldOperatorType === "oem"}
              onChange={() => setFieldOperatorType("oem")}
              className="mt-0.5"
            />
            <div>
              <div className="font-medium text-sm">OEM Teleoperator</div>
              <div className="text-xs text-gray-600">
                Tests robots for robotics companies
              </div>
            </div>
          </label>
          <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="fieldOperatorType"
              value="owner"
              checked={fieldOperatorType === "owner"}
              onChange={() => setFieldOperatorType("owner")}
              className="mt-0.5"
            />
            <div>
              <div className="font-medium text-sm">Property Cleaner</div>
              <div className="text-xs text-gray-600">
                Cleans properties for location owners
              </div>
            </div>
          </label>
        </div>
        <button
          type="button"
          onClick={() => setShowFieldOperatorType(true)}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue
        </button>
      </div>
    );
  }

  // Admins can't change organization
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
        />
        <p className="text-xs text-gray-500 mt-1.5">
          Admin users belong to SuperVolcano organization
        </p>
      </div>
    );
  }

  // Roles that don't require organization
  if (!organizationType) {
    return null;
  }

  return (
    <div>
      <label
        htmlFor="organizationId"
        className="block text-sm font-medium text-gray-700 mb-1.5"
      >
        Organization <span className="text-red-500">*</span>
      </label>

      {loading ? (
        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
          Loading organizations...
        </div>
      ) : error ? (
        <div className="text-sm text-red-600">
          Error loading organizations: {error}
        </div>
      ) : (
        <>
          <select
            id="organizationId"
            value={value}
            onChange={(e) => {
              if (e.target.value === "__create_new__" && onCreateNew) {
                onCreateNew(organizationType!);
              } else {
                onChange(e.target.value);
              }
            }}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
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
              "Select which robotics company this user belongs to"}
            {organizationType === "location_owner" &&
              "Select which property owner this user belongs to"}
          </p>
        </>
      )}
    </div>
  );
}

