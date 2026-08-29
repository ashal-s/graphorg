/** Postgres error codes (see https://www.postgresql.org/docs/current/errcodes-appendix.html). */
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

interface PgErrorLike {
  code?: string;
  cause?: unknown;
}

/**
 * The `postgres` driver throws a `PostgresError` with a `.code` field, but
 * drizzle-orm's query methods catch it and rethrow a `DrizzleQueryError`
 * (message: "Failed query: ...") with the original error attached as
 * `.cause`, not `.code` directly. Unwrap one level of `.cause` so callers
 * can check the real Postgres error code either way.
 */
function pgCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const { code, cause } = error as PgErrorLike;
  if (typeof code === "string") return code;
  if (typeof cause === "object" && cause !== null && "code" in cause) {
    return (cause as PgErrorLike).code;
  }
  return undefined;
}

/** Whether `error` is the `postgres` driver's error for a violated UNIQUE constraint. */
export function isUniqueViolation(error: unknown): boolean {
  return pgCode(error) === UNIQUE_VIOLATION;
}

/** Whether `error` is the `postgres` driver's error for a violated FOREIGN KEY constraint. */
export function isForeignKeyViolation(error: unknown): boolean {
  return pgCode(error) === FOREIGN_KEY_VIOLATION;
}
