/**
 * AUTHENTICATION SERVICE
 * Centralized auth token management
 */
import { getAuth } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebaseClient";

class AuthService {
  private tokenCache: string | null = null;
  private tokenExpiry: number | null = null;

  async getAuthToken(forceRefresh = false): Promise<string> {
    // Return cached token if still valid and not forcing refresh
    if (
      !forceRefresh &&
      this.tokenCache &&
      this.tokenExpiry &&
      Date.now() < this.tokenExpiry
    ) {
      return this.tokenCache;
    }

    // Check if we're in browser context
    if (typeof window === "undefined") {
      throw new Error("Auth service only works in browser context");
    }

    // Use Firebase Auth directly
    try {
      const auth = firebaseAuth;
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error("No authenticated user");
      }

      const token = await currentUser.getIdToken(forceRefresh);
      this.tokenCache = token;
      // Cache for 50 minutes (tokens typically expire in 1 hour)
      this.tokenExpiry = Date.now() + 50 * 60 * 1000;
      return token;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Authentication error occurred";

      if (errorMessage.includes("No authenticated user")) {
        throw new Error(
          "Authentication required. Please refresh the page and sign in again.",
        );
      }

      throw new Error(`Failed to get auth token: ${errorMessage}`);
    }
  }

  /**
   * Get auth token with force refresh
   * Useful for when we know token might be stale
   */
  async getAuthTokenForceRefresh(): Promise<string> {
    return this.getAuthToken(true);
  }

  clearCache(): void {
    this.tokenCache = null;
    this.tokenExpiry = null;
  }
}

export const authService = new AuthService();

