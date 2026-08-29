import { NextResponse, type NextRequest } from "next/server";
import type { ZodError } from "zod";

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
