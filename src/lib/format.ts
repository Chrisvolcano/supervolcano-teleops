import type { TimestampLike } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function resolveTimestamp(value: TimestampLike | string | number | Date | undefined | null) {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  if (typeof value === "object") {
    if ("toDate" in value && typeof value.toDate === "function") {
      return value.toDate();
    }
    if ("seconds" in value && typeof value.seconds === "number") {
      const milliseconds = value.seconds * 1000 + Math.floor((value.nanoseconds ?? 0) / 1_000_000);
      return new Date(milliseconds);
    }
  }
  return undefined;
}

export function toTimestampLike(value: unknown): TimestampLike | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object") {
    if ("toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
      return value as { toDate: () => Date };
    }
    if ("seconds" in value && typeof (value as { seconds?: unknown }).seconds === "number") {
      const candidate = value as { seconds: number; nanoseconds?: number };
      return {
        seconds: candidate.seconds,
        nanoseconds: typeof candidate.nanoseconds === "number" ? candidate.nanoseconds : 0,
      };
    }
  }
  return null;
}

export function formatDateTime(value: TimestampLike | string | number | Date | undefined | null) {
  const date = resolveTimestamp(value);
  if (!date) return "–";
  return dateFormatter.format(date);
}

export function formatDuration(totalSeconds: number | undefined | null) {
  if (!totalSeconds || totalSeconds <= 0) return "0m";
  const seconds = Math.floor(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
