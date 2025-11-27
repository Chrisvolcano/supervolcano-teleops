/**
 * USERS HOOK
 * React hook for managing user data with caching and filtering
 */

import { useState, useEffect, useCallback } from "react";
import { usersService } from "@/services/users.service";
import { useAuth } from "@/hooks/useAuth";
import type { User, UserFilters } from "@/domain/user/user.types";

interface UseUsersResult {
  users: User[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  filter: (filters: UserFilters) => void;
}

export function useUsers(): UseUsersResult {
  const { getIdToken } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<UserFilters>({});

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getIdToken(true);
      if (!token) {
        throw new Error("Not authenticated");
      }
      const data = await usersService.listUsers(token);
      setUsers(data);
      setFilteredUsers(data);
    } catch (err) {
      setError(err as Error);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  // Client-side filtering for instant feedback
  useEffect(() => {
    let filtered = users;

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.email?.toLowerCase().includes(search) ||
          u.displayName?.toLowerCase().includes(search) ||
          u.firestore?.displayName?.toLowerCase().includes(search),
      );
    }

    if (filters.role) {
      filtered = filtered.filter(
        (u) => u.auth.role === filters.role || u.firestore?.role === filters.role,
      );
    }

    if (filters.syncStatus) {
      filtered = filtered.filter((u) => u.syncStatus === filters.syncStatus);
    }

    if (filters.organizationId) {
      filtered = filtered.filter(
        (u) =>
          u.auth.organizationId === filters.organizationId ||
          u.firestore?.organizationId === filters.organizationId,
      );
    }

    setFilteredUsers(filtered);
  }, [users, filters]);

  const filter = useCallback((newFilters: UserFilters) => {
    setFilters((prev) => {
      const merged = { ...prev, ...newFilters };
      // Remove undefined values to clear filters
      Object.keys(merged).forEach((key) => {
        if (merged[key as keyof UserFilters] === undefined) {
          delete merged[key as keyof UserFilters];
        }
      });
      return merged;
    });
  }, []);

  return {
    users: filteredUsers,
    loading,
    error,
    refresh: loadUsers,
    filter,
  };
}

