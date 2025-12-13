/**
 * USER ROW COMPONENT
 * Individual user row with status indicators and quick actions
 */

"use client";

import { useState } from "react";
import { CheckCircle, AlertCircle, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { DeleteUserModal } from "./DeleteUserModal";
import { usersService } from "@/services/users.service";
import type { User, UserRole } from "@/domain/user/user.types";

interface UserRowProps {
  user: User;
  onEdit: () => void;
  onDeleted: () => void;
}

export function UserRow({ user, onEdit, onDeleted }: UserRowProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await usersService.deleteUser(user.uid);
      setShowDeleteModal(false);
      onDeleted();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete user";
      alert(`Failed to delete user: ${message}`);
    } finally {
      setIsDeleting(false);
    }
  }

  const displayName =
    user.displayName ||
    user.firestore?.displayName ||
    user.email.split("@")[0];
  const role = user.auth.role || user.firestore?.role;
  const organization =
    user.auth.organizationId || user.firestore?.organizationId;

  return (
    <>
      <TableRow className="hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors border-gray-100 dark:border-[#1f1f1f]">
        {/* User Info */}
        <TableCell>
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${getUserAvatarColor(role)}`}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">{displayName}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
            </div>
          </div>
        </TableCell>

        {/* Role */}
        <TableCell>
          <RoleBadge role={role} />
        </TableCell>

        {/* Organization */}
        <TableCell>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {organization ? (
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-500/20 rounded text-xs font-mono text-gray-700 dark:text-gray-400">
                {organization.slice(0, 8)}...
              </span>
            ) : (
              <span className="text-gray-400 dark:text-gray-500">—</span>
            )}
          </span>
        </TableCell>

        {/* Sync Status */}
        <TableCell>
          <SyncStatusBadge
            syncStatus={user.syncStatus}
            issues={user.syncIssues}
          />
        </TableCell>

        {/* Actions */}
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              className="gap-1.5 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {showDeleteModal && (
        <DeleteUserModal
          user={{
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
          }}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}

// Role Badge Component
function RoleBadge({ role }: { role?: UserRole }) {
  if (!role) {
    return (
      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400 rounded text-xs font-medium">
        No role
      </span>
    );
  }

  const configs: Record<
    string,
    { bg: string; text: string; label: string }
  > = {
    admin: { bg: "bg-purple-100 dark:bg-purple-500/20", text: "text-purple-700 dark:text-purple-400", label: "Admin" },
    superadmin: {
      bg: "bg-purple-100 dark:bg-purple-500/20",
      text: "text-purple-700 dark:text-purple-400",
      label: "Super Admin",
    },
    org_manager: {
      bg: "bg-blue-100 dark:bg-blue-500/20",
      text: "text-blue-700 dark:text-blue-400",
      label: "Org Manager",
    },
    partner_manager: {
      bg: "bg-blue-100 dark:bg-blue-500/20",
      text: "text-blue-700 dark:text-blue-400",
      label: "Partner Manager",
    },
    partner_admin: {
      bg: "bg-blue-100 dark:bg-blue-500/20",
      text: "text-blue-700 dark:text-blue-400",
      label: "Partner Admin",
    },
    location_owner: {
      bg: "bg-blue-100 dark:bg-blue-500/20",
      text: "text-blue-700 dark:text-blue-400",
      label: "Location Owner",
    },
    oem_teleoperator: {
      bg: "bg-green-100 dark:bg-green-500/20",
      text: "text-green-700 dark:text-green-400",
      label: "OEM Teleoperator",
    },
    location_cleaner: {
      bg: "bg-green-100 dark:bg-green-500/20",
      text: "text-green-700 dark:text-green-400",
      label: "Location Cleaner",
    },
    teleoperator: {
      bg: "bg-green-100 dark:bg-green-500/20",
      text: "text-green-700 dark:text-green-400",
      label: "Teleoperator",
    },
  };

  const config =
    configs[role] ||
    { bg: "bg-gray-100 dark:bg-gray-500/20", text: "text-gray-700 dark:text-gray-400", label: role };

  return (
    <span
      className={`px-2 py-1 ${config.bg} ${config.text} rounded text-xs font-medium`}
    >
      {config.label}
    </span>
  );
}

// Sync Status Badge Component
function SyncStatusBadge({
  syncStatus,
  issues,
}: {
  syncStatus: User["syncStatus"];
  issues: string[];
}) {
  const configs = {
    synced: {
      icon: CheckCircle,
      bg: "bg-green-100 dark:bg-green-500/20",
      text: "text-green-700 dark:text-green-400",
      border: "border-green-200 dark:border-green-500/30",
      label: "Synced",
    },
    auth_only: {
      icon: AlertCircle,
      bg: "bg-yellow-100 dark:bg-yellow-500/20",
      text: "text-yellow-700 dark:text-yellow-400",
      border: "border-yellow-200 dark:border-yellow-500/30",
      label: "Auth only",
    },
    firestore_only: {
      icon: AlertCircle,
      bg: "bg-yellow-100 dark:bg-yellow-500/20",
      text: "text-yellow-700 dark:text-yellow-400",
      border: "border-yellow-200 dark:border-yellow-500/30",
      label: "Firestore only",
    },
    mismatched: {
      icon: AlertCircle,
      bg: "bg-red-100 dark:bg-red-500/20",
      text: "text-red-700 dark:text-red-400",
      border: "border-red-200 dark:border-red-500/30",
      label: "Out of sync",
    },
  };

  const config = configs[syncStatus];
  const Icon = config.icon;

  return (
    <div className="group relative">
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-1 ${config.bg} ${config.text} border ${config.border} rounded text-xs font-medium`}
      >
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>

      {/* Tooltip on hover */}
      {issues.length > 0 && (
        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10">
          <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded px-3 py-2 whitespace-nowrap shadow-lg">
            <div className="font-semibold mb-1">Issues:</div>
            {issues.map((issue, i) => (
              <div key={i}>• {issue}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Utility: Get avatar color based on role
function getUserAvatarColor(role?: UserRole): string {
  const colors: Record<string, string> = {
    admin: "bg-purple-500",
    superadmin: "bg-purple-600",
    org_manager: "bg-blue-500",
    partner_manager: "bg-blue-600",
    partner_admin: "bg-blue-600",
    location_owner: "bg-blue-600",
    oem_teleoperator: "bg-green-500",
    location_cleaner: "bg-green-500",
    teleoperator: "bg-green-600",
  };
  return role ? colors[role] || "bg-neutral-500" : "bg-neutral-500";
}
