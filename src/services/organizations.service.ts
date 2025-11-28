/**
 * ORGANIZATIONS SERVICE
 * Manages organization CRUD operations
 */

import { authService } from "./auth.service";
import type {
  Organization,
  CreateOrganizationRequest,
  OrganizationType,
} from "@/types/organization.types";

export class OrganizationsServiceError extends Error {
  constructor(
    message: string,
    public code:
      | "AUTH_ERROR"
      | "NETWORK_ERROR"
      | "VALIDATION_ERROR"
      | "SERVER_ERROR",
    public statusCode?: number,
  ) {
    super(message);
    this.name = "OrganizationsServiceError";
  }
}

class OrganizationsService {
  private readonly baseUrl = "/api/admin/organizations";
  private cache: Map<OrganizationType, Organization[]> = new Map();
  private cacheExpiry: Map<OrganizationType, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async listOrganizations(type?: OrganizationType): Promise<Organization[]> {
    // Check cache first
    if (type && this.cache.has(type)) {
      const expiry = this.cacheExpiry.get(type);
      if (expiry && Date.now() < expiry) {
        return this.cache.get(type)!;
      }
    }

    try {
      const token = await authService.getAuthToken();
      const url = type ? `${this.baseUrl}?type=${type}` : this.baseUrl;

      const response = await fetch(url, {
        headers: {
          "x-firebase-token": token,
        },
      });

      if (response.status === 401) {
        authService.clearCache();
        throw new OrganizationsServiceError(
          "Your session has expired. Please refresh the page.",
          "AUTH_ERROR",
          401,
        );
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new OrganizationsServiceError(
          data.error || "Failed to fetch organizations",
          "SERVER_ERROR",
          response.status,
        );
      }

      const data = await response.json();
      const organizations = data.organizations || [];

      // Update cache
      if (type) {
        this.cache.set(type, organizations);
        this.cacheExpiry.set(type, Date.now() + this.CACHE_TTL);
      }

      return organizations;
    } catch (error) {
      if (error instanceof OrganizationsServiceError) {
        throw error;
      }

      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new OrganizationsServiceError(
          "Network error. Please check your connection and try again.",
          "NETWORK_ERROR",
        );
      }

      throw new OrganizationsServiceError(
        "An unexpected error occurred. Please try again.",
        "SERVER_ERROR",
      );
    }
  }

  async createOrganization(
    request: CreateOrganizationRequest,
  ): Promise<Organization> {
    try {
      const token = await authService.getAuthToken();

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "x-firebase-token": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (response.status === 401) {
        authService.clearCache();
        throw new OrganizationsServiceError(
          "Your session has expired. Please refresh the page.",
          "AUTH_ERROR",
          401,
        );
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new OrganizationsServiceError(
          data.error || "Failed to create organization",
          "SERVER_ERROR",
          response.status,
        );
      }

      const data = await response.json();

      // Clear cache for this type
      this.clearCache(request.type);

      return data.organization;
    } catch (error) {
      if (error instanceof OrganizationsServiceError) {
        throw error;
      }

      throw new OrganizationsServiceError(
        "An unexpected error occurred. Please try again.",
        "SERVER_ERROR",
      );
    }
  }

  async updateOrganization(
    id: string,
    updates: { name?: string; contactEmail?: string; contactPhone?: string }
  ): Promise<void> {
    try {
      const token = await authService.getAuthToken();
      const encodedId = encodeURIComponent(id);

      const response = await fetch(`${this.baseUrl}/${encodedId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-firebase-token": token,
        },
        body: JSON.stringify(updates),
      });

      if (response.status === 401) {
        authService.clearCache();
        throw new OrganizationsServiceError(
          "Your session has expired. Please refresh the page.",
          "AUTH_ERROR",
          401
        );
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new OrganizationsServiceError(
          data.error || "Failed to update organization",
          "SERVER_ERROR",
          response.status
        );
      }

      // Invalidate cache
      this.cache.clear();
      this.cacheExpiry.clear();
    } catch (error) {
      if (error instanceof OrganizationsServiceError) {
        throw error;
      }

      throw new OrganizationsServiceError(
        "An unexpected error occurred. Please try again.",
        "SERVER_ERROR"
      );
    }
  }

  async deleteOrganization(id: string): Promise<void> {
    try {
      const token = await authService.getAuthToken();
      const encodedId = encodeURIComponent(id);

      const response = await fetch(`${this.baseUrl}/${encodedId}`, {
        method: "DELETE",
        headers: {
          "x-firebase-token": token,
        },
      });

      if (response.status === 401) {
        authService.clearCache();
        throw new OrganizationsServiceError(
          "Your session has expired. Please refresh the page.",
          "AUTH_ERROR",
          401
        );
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new OrganizationsServiceError(
          data.error || "Failed to delete organization",
          "SERVER_ERROR",
          response.status
        );
      }

      // Invalidate cache
      this.cache.clear();
      this.cacheExpiry.clear();
    } catch (error) {
      if (error instanceof OrganizationsServiceError) {
        throw error;
      }

      throw new OrganizationsServiceError(
        "An unexpected error occurred. Please try again.",
        "SERVER_ERROR"
      );
    }
  }

  clearCache(type?: OrganizationType): void {
    if (type) {
      this.cache.delete(type);
      this.cacheExpiry.delete(type);
    } else {
      this.cache.clear();
      this.cacheExpiry.clear();
    }
  }
}

export const organizationsService = new OrganizationsService();

