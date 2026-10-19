/**
 * Cross-cutting types shared by GraphOrg's Next.js app (and later, typed
 * request contracts for the Python AI worker). Domain entities live in
 * `apps/web/src/db/schema`; this package holds API envelope helpers only.
 */

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}
