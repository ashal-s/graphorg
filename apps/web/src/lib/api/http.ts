import { NextResponse, type NextRequest } from "next/server";
import { z, type ZodError } from "zod";

/** Uniform `{ error }` JSON error body, matching the shape src/app/api/teams/route.ts established. */
export function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/** 400 with per-field messages, for a failed `schema.safeParse(...)`. */
export function jsonValidationError(error: ZodError) {
  return NextResponse.json(
    { error: "Invalid request body", details: error.flatten().fieldErrors },
    { status: 400 },
  );
}

/**
 * `request.json()`, but a malformed body (empty, not JSON) resolves to
 * `undefined` instead of throwing, so callers can feed it straight into a
 * zod `safeParse` and get a normal 400 validation error rather than an
 * unhandled rejection.
 */
export async function readJsonBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/**
 * 400 if a successfully-parsed PATCH body has no keys at all (e.g. `{}`).
 * Every field on a `.partial()` update schema is optional, so this is the
 * one case zod itself accepts but the route still needs to reject: Drizzle's
 * `update(...).set({})` throws a raw `"No values to set"` error rather than
 * running a no-op update, which would otherwise surface as an unhandled 500.
 */
export function requireNonEmptyPatch(data: object): NextResponse | null {
  return Object.keys(data).length === 0
    ? jsonError(400, "request body must include at least one field to update")
    : null;
}

const uuidSchema = z.string().uuid();

/**
 * 400 if `id` (a `[id]` route param, taken straight off the URL — never
 * run through a zod body schema the way request-body fields are) isn't a
 * UUID. Every `id` column in this schema is a Postgres `uuid` column, so a
 * malformed value like `/api/people/not-a-uuid` would otherwise reach the
 * database as an invalid cast and surface as an unhandled 500 instead of
 * this clean 400.
 */
export function requireUuidParam(
  id: string,
  paramName = "id",
): NextResponse | null {
  return uuidSchema.safeParse(id).success
    ? null
    : jsonError(400, `${paramName} is not a valid id`);
}
