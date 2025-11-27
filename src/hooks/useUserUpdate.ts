/**
 * USER UPDATE HOOK
 * Handles user updates with optimistic updates
 */

import { useState, useCallback } from "react";
import { usersService } from "@/services/users.service";
import { useAuth } from "@/hooks/useAuth";
import type { UserUpdateRequest } from "@/domain/user/user.types";

interface UseUserUpdateResult {
  updating: boolean;
  error: Error | null;
  updateUser: (uid: string, updates: UserUpdateRequest) => Promise<void>;
}

export function useUserUpdate(
  onSuccess?: () => void,
): UseUserUpdateResult {
  const { getIdToken } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateUser = useCallback(
    async (uid: string, updates: UserUpdateRequest) => {
      try {
        setUpdating(true);
        setError(null);
        const token = await getIdToken(true);
        if (!token) {
          throw new Error("Not authenticated");
        }
        await usersService.updateUser(token, uid, updates);
        onSuccess?.();
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setUpdating(false);
      }
    },
    [getIdToken, onSuccess],
  );

  return { updating, error, updateUser };
}

