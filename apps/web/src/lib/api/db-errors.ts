/** Postgres error codes (see https://www.postgresql.org/docs/current/errcodes-appendix.html). */
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

interface PgErrorLike {
  code?: string;
  /** node-postgres (`pg`) */
  constraint?: string;
  /** postgres.js (legacy; kept so tests/fixtures still unwrap) */
  constraint_name?: string;
  cause?: unknown;
}

/**
 * Drivers expose `.code` plus a constraint name field (`constraint` on
 * node-postgres, `constraint_name` on postgres.js). drizzle-orm's query
 * methods catch the driver error and rethrow a `DrizzleQueryError`
 * (message: "Failed query: ...") with the original as `.cause`. Unwrap one
 * level of `.cause` so callers can read the real Postgres error either way.
 */
function pgErrorLike(error: unknown): PgErrorLike | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const { code, constraint, constraint_name, cause } = error as PgErrorLike;
  if (typeof code === "string") {
    return { code, constraint, constraint_name };
  }
  if (typeof cause === "object" && cause !== null && "code" in cause) {
    return cause as PgErrorLike;
  }
  return undefined;
}

/** Whether `error` is a Postgres UNIQUE constraint violation. */
export function isUniqueViolation(error: unknown): boolean {
  return pgErrorLike(error)?.code === UNIQUE_VIOLATION;
}

/** Whether `error` is a Postgres FOREIGN KEY constraint violation. */
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
  const pg = pgErrorLike(error);
  return pg?.constraint ?? pg?.constraint_name;
}
