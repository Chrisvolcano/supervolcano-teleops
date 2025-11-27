"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Download,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUsers } from "@/hooks/useUsers";
import { UserRow } from "./UserRow";
import { UserEditDrawer } from "./UserEditDrawer";
import { CreateUserModal } from "./CreateUserModal";
import { EmptyState } from "./EmptyState";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { QuickFilters } from "./QuickFilters";
import type { User } from "@/domain/user/user.types";

export default function UsersTable() {
  const { users, loading, error, refresh, filter } = useUsers();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout>();

  // Debounced search
  const handleSearch = useCallback(
    (value: string) => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      const timeout = setTimeout(() => {
        filter({ search: value || undefined });
      }, 300);
      setDebounceTimeout(timeout);
    },
    [filter, debounceTimeout],
  );

  useEffect(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [debounceTimeout]);

  // Stats for badges
  const stats = useMemo(
    () => ({
      total: users.length,
      synced: users.filter((u) => u.syncStatus === "synced").length,
      issues: users.filter((u) => u.syncStatus !== "synced").length,
    }),
    [users],
  );

  // Export to CSV
  const exportToCSV = useCallback((usersToExport: User[]) => {
    const headers = [
      "Email",
      "Display Name",
      "Role",
      "Organization ID",
      "Sync Status",
      "Last Sign In",
    ];
    const rows = usersToExport.map((u) => [
      u.email,
      u.displayName || u.firestore?.displayName || "",
      u.auth.role || u.firestore?.role || "",
      u.auth.organizationId || u.firestore?.organizationId || "",
      u.syncStatus,
      u.lastSignInTime || "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell)}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `users-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load users</h3>
          <p className="text-neutral-600 mb-4">{error.message}</p>
          <Button onClick={() => void refresh()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-neutral-700" />
          <h2 className="text-2xl font-bold">Users</h2>
          <div className="flex gap-2">
            <span className="px-2.5 py-1 bg-neutral-100 text-neutral-700 rounded-full text-sm font-medium">
              {stats.total} total
            </span>
            {stats.issues > 0 && (
              <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                {stats.issues} need sync
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Create User
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToCSV(users)}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <Input
            type="text"
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            className="pl-10"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
        </Button>
      </div>

      {/* Quick Filters */}
      {showFilters && <QuickFilters onFilterChange={filter} />}

      {/* Table or Empty State */}
      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : users.length === 0 ? (
        <EmptyState onRefresh={() => void refresh()} />
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <UserRow
                    key={user.uid}
                    user={user}
                    onEdit={() => setSelectedUser(user)}
                    onDeleted={() => void refresh()}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Edit Drawer */}
      {selectedUser && (
        <UserEditDrawer
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSuccess={() => {
            setSelectedUser(null);
            void refresh();
          }}
        />
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            void refresh();
          }}
        />
      )}
    </div>
  );
}

