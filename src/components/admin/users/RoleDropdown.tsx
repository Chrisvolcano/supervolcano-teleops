/**
 * ROLE DROPDOWN COMPONENT
 * Displays roles grouped by business model with descriptions
 * Better UX than flat list of roles
 */

"use client";

import {
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_GROUPS,
  type UserRole,
} from "@/domain/user/user.types";

interface RoleDropdownProps {
  value: UserRole | "";
  onChange: (value: UserRole) => void;
  disabled?: boolean;
}

export function RoleDropdown({
  value,
  onChange,
  disabled,
}: RoleDropdownProps) {
  return (
    <div>
      <label
        htmlFor="role"
        className="block text-sm font-medium text-gray-700 mb-1.5"
      >
        Role <span className="text-red-500" aria-label="required">*</span>
      </label>

      <select
        id="role"
        value={value}
        onChange={(e) => onChange(e.target.value as UserRole)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
        aria-required="true"
      >
        <option value="">Select role</option>

        <optgroup label="Platform Administration">
          {ROLE_GROUPS.platform.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </optgroup>

        <optgroup label="OEM Robotics (B2B)">
          {ROLE_GROUPS.oem_b2b.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </optgroup>

        <optgroup label="Property Management (B2C)">
          {ROLE_GROUPS.property_b2c.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </optgroup>
      </select>

      {value && (
        <p className="text-xs text-gray-600 mt-1.5">
          {ROLE_DESCRIPTIONS[value as UserRole]}
        </p>
      )}
    </div>
  );
}

