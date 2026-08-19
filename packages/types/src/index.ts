/**
 * Cross-cutting types shared by GraphOrg's Next.js app and, later, its
 * Python worker's typed request contracts. Domain entities (people, teams,
 * services, ...) land here once the relational model (WEB-130) exists.
 */

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}
