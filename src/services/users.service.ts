/**
 * USER SERVICE
 * Clean API abstraction for user operations
 */

import { authService } from "./auth.service";
import type { User, UserUpdateRequest, UserFilters } from "@/domain/user/user.types";

export class UsersServiceError extends Error {
  constructor(
    message: string,
    public code: "AUTH_ERROR" | "NETWORK_ERROR" | "VALIDATION_ERROR" | "SERVER_ERROR",
    public statusCode?: number,
  ) {
    super(message);
    this.name = "UsersServiceError";
  }
}

class UsersService {
  private readonly baseUrl = "/api/admin/users";

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

  async updateUser(uid: string, updates: UserUpdateRequest): Promise<void> {
    try {
      const token = await authService.getAuthToken();

      const response = await fetch(`${this.baseUrl}/${uid}`, {
        method: "PATCH",
        headers: {
          "x-firebase-token": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (response.status === 401) {
        authService.clearCache();
        throw new UsersServiceError(
          "Your session has expired. Please refresh the page.",
          "AUTH_ERROR",
          401,
        );
      }

      if (response.status === 403) {
        throw new UsersServiceError(
          "You do not have permission to perform this action.",
          "AUTH_ERROR",
          403,
        );
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new UsersServiceError(
          data.error || "Failed to update user",
          "SERVER_ERROR",
          response.status,
        );
      }
    } catch (error) {
      if (error instanceof UsersServiceError) {
        throw error;
      }

      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new UsersServiceError(
          "Network error. Please check your connection and try again.",
          "NETWORK_ERROR",
        );
      }

      if (error instanceof Error && error.message.includes("Authentication")) {
        throw new UsersServiceError(
          error.message,
          "AUTH_ERROR",
        );
      }

      throw new UsersServiceError(
        "An unexpected error occurred. Please try again.",
        "SERVER_ERROR",
      );
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

  async deleteUser(uid: string): Promise<void> {
    try {
      const token = await authService.getAuthToken();

      const response = await fetch(`${this.baseUrl}/${uid}`, {
        method: "DELETE",
        headers: {
          "x-firebase-token": token,
        },
      });

      if (response.status === 401) {
        authService.clearCache();
        throw new UsersServiceError(
          "Your session has expired. Please refresh the page.",
          "AUTH_ERROR",
          401,
        );
      }

      if (response.status === 403) {
        throw new UsersServiceError(
          "You do not have permission to delete users.",
          "AUTH_ERROR",
          403,
        );
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new UsersServiceError(
          data.error || "Failed to delete user",
          "SERVER_ERROR",
          response.status,
        );
      }
    } catch (error) {
      if (error instanceof UsersServiceError) {
        throw error;
      }

      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new UsersServiceError(
          "Network error. Please check your connection and try again.",
          "NETWORK_ERROR",
        );
      }

      if (error instanceof Error && error.message.includes("Authentication")) {
        throw new UsersServiceError(
          error.message,
          "AUTH_ERROR",
        );
      }

      throw new UsersServiceError(
        "An unexpected error occurred. Please try again.",
        "SERVER_ERROR",
      );
    }
  }
}

export const usersService = new UsersService();

