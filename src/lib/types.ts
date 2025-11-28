/**
 * Legacy types file - re-exports from types/index.ts for backward compatibility
 * All new types should be added to types/index.ts
 */

// Re-export everything from the new types module
export * from "./types/index";

// Also export legacy types that might be used elsewhere
export type {
  Teleoperator,
  TeleoperatorStatus,
  Location,
  LocationStatus,
  Task,
  TaskStatus,
  Shift,
  Partner,
  UserRole,
  UserClaims,
} from "./types/index";
