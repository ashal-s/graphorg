/** Postgres error codes (see https://www.postgresql.org/docs/current/errcodes-appendix.html). */
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

interface PgErrorLike {
  code?: string;
  constraint_name?: string;
  cause?: unknown;
}

/**
 * The `postgres` driver throws a `PostgresError` with `.code`/
 * `.constraint_name` fields, but drizzle-orm's query methods catch it and
 * rethrow a `DrizzleQueryError` (message: "Failed query: ...") with the
 * original error attached as `.cause`, not those fields directly. Unwrap one
 * level of `.cause` so callers can read the real Postgres error either way.
 */
function pgErrorLike(error: unknown): PgErrorLike | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const { code, constraint_name, cause } = error as PgErrorLike;
  if (typeof code === "string") return { code, constraint_name };
  if (typeof cause === "object" && cause !== null && "code" in cause) {
    return cause as PgErrorLike;
  }
  return undefined;
}

/** Whether `error` is the `postgres` driver's error for a violated UNIQUE constraint. */
export function isUniqueViolation(error: unknown): boolean {
  return pgErrorLike(error)?.code === UNIQUE_VIOLATION;
}

/** Whether `error` is the `postgres` driver's error for a violated FOREIGN KEY constraint. */
export function isForeignKeyViolation(error: unknown): boolean {
  return pgErrorLike(error)?.code === FOREIGN_KEY_VIOLATION;
}

/**
 * The name of the constraint a `23505`/`23503` error violated (e.g.
 * `people_user_id_unique`), so a route can tell *which* of several unique
 * constraints on the same table was hit and give a specific message instead
 * of a generic one.
 */
export function pgConstraintName(error: unknown): string | undefined {
  return pgErrorLike(error)?.constraint_name;
}
