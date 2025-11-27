/**
 * USER SERVICE
 * Handles all user-related API calls with proper error handling
 */

import type {
  User,
  UserUpdateRequest,
  UserFilters,
} from "@/domain/user/user.types";
import { useAuth } from "@/hooks/useAuth";

class UsersService {
  private async getAuthToken(): Promise<string> {
    // This will be called from client components
    // We'll need to handle this differently in hooks
    throw new Error(
      "getAuthToken should be called from hooks, not directly from service",
    );
  }

  async listUsers(
    token: string,
    filters?: UserFilters,
  ): Promise<User[]> {
    const params = new URLSearchParams();
    if (filters?.role) params.set("role", filters.role);
    if (filters?.syncStatus) params.set("syncStatus", filters.syncStatus);
    if (filters?.organizationId)
      params.set("organizationId", filters.organizationId);

    const queryString = params.toString();
    const url = `/api/admin/users${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      headers: { "x-firebase-token": token },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: `Failed to fetch users: ${response.statusText}`,
      }));
      throw new Error(error.error || `Failed to fetch users: ${response.statusText}`);
    }

    const data = await response.json();
    return data.users || [];
  }

  async getUser(token: string, uid: string): Promise<User> {
    const response = await fetch(`/api/admin/users/${uid}`, {
      headers: { "x-firebase-token": token },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: `Failed to fetch user: ${response.statusText}`,
      }));
      throw new Error(error.error || `Failed to fetch user: ${response.statusText}`);
    }

    const data = await response.json();
    return data.user;
  }

  async updateUser(
    token: string,
    uid: string,
    updates: UserUpdateRequest,
  ): Promise<void> {
    const response = await fetch(`/api/admin/users/${uid}`, {
      method: "PATCH",
      headers: {
        "x-firebase-token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: "Failed to update user",
      }));
      throw new Error(error.error || "Failed to update user");
    }
  }

  async syncUser(
    token: string,
    uid: string,
    direction: "toAuth" | "toFirestore" | "both",
  ): Promise<void> {
    const response = await fetch(`/api/admin/users/${uid}/sync`, {
      method: "POST",
      headers: {
        "x-firebase-token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ direction }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: "Failed to sync user",
      }));
      throw new Error(error.error || "Failed to sync user");
    }
  }
}

export const usersService = new UsersService();

