/**
 * USER UPDATE HOOK
 * Handles user updates with proper state management
 */

import { useState, useCallback } from "react";
import { usersService, UsersServiceError } from "@/services/users.service";
import type { UserUpdateRequest } from "@/domain/user/user.types";

type UpdateState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success" }
  | { status: "error"; error: UsersServiceError };

export function useUserUpdate(onSuccess?: () => void) {
  const [state, setState] = useState<UpdateState>({ status: "idle" });

  const updateUser = useCallback(
    async (uid: string, updates: UserUpdateRequest) => {
      setState({ status: "loading" });

      try {
        await usersService.updateUser(uid, updates);
        setState({ status: "success" });
        onSuccess?.();
      } catch (error) {
        if (error instanceof UsersServiceError) {
          setState({ status: "error", error });
        } else {
          setState({
            status: "error",
            error: new UsersServiceError(
              "An unexpected error occurred",
              "SERVER_ERROR",
            ),
          });
        }
        throw error;
      }
    },
    [onSuccess],
  );

  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return {
    updateUser,
    reset,
    isLoading: state.status === "loading",
    isSuccess: state.status === "success",
    isError: state.status === "error",
    error: state.status === "error" ? state.error : null,
    updating: state.status === "loading", // Legacy support
  };
}

