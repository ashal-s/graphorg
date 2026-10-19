/** Fallback when an API response has no usable error message. */
export const GENERIC_ERROR = "Something went wrong. Please try again.";

/**
 * Picks a user-facing message from a failed API JSON body: first Zod field
 * error, then `error` string, then {@link GENERIC_ERROR}.
 */
export function messageFromApiError(body: unknown): string {
  if (!body || typeof body !== "object") return GENERIC_ERROR;

  const record = body as {
    error?: unknown;
    details?: Record<string, string[] | undefined>;
  };

  const firstFieldError = record.details
    ? Object.values(record.details).flat()[0]
    : undefined;
  if (typeof firstFieldError === "string" && firstFieldError.length > 0) {
    return firstFieldError;
  }

  if (typeof record.error === "string" && record.error.length > 0) {
    return record.error;
  }

  return GENERIC_ERROR;
}
