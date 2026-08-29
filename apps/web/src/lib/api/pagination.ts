import { and, asc, eq, gt, or } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { NextResponse } from "next/server";

import { jsonError } from "./http";

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

interface CursorValue {
  name: string;
  id: string;
}

/** Opaque, URL-safe cursor: base64 of `{ name, id }`, the keyset position. */
function encodeCursor(value: CursorValue): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decodeCursor(raw: string): CursorValue | null {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    );
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as CursorValue).name === "string" &&
      typeof (parsed as CursorValue).id === "string"
    ) {
      return parsed as CursorValue;
    }
  } catch {
    // Falls through to null below: an invalid cursor is a 400, not a crash.
  }
  return null;
}

export interface ParsedPage {
  limit: number;
  after?: CursorValue;
}

/**
 * Reads `?limit=` and `?cursor=` off a request's query string. Returns a
 * `400` `NextResponse` (not a thrown error) if either is malformed, so
 * callers can `return` it directly the same way they do a validation error.
 */
export function parsePageParams(
  searchParams: URLSearchParams,
): ParsedPage | NextResponse {
  const limitRaw = searchParams.get("limit");
  let limit = DEFAULT_PAGE_SIZE;
  if (limitRaw !== null) {
    const parsedLimit = Number(limitRaw);
    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > MAX_PAGE_SIZE
    ) {
      return jsonError(
        400,
        `limit must be an integer between 1 and ${MAX_PAGE_SIZE}`,
      );
    }
    limit = parsedLimit;
  }

  const cursorRaw = searchParams.get("cursor");
  if (cursorRaw === null) return { limit };

  const after = decodeCursor(cursorRaw);
  if (!after) return jsonError(400, "cursor is invalid");
  return { limit, after };
}

/**
 * The keyset predicate for "rows after `page.after`, ordered by
 * `(name, id)`" — `undefined` (no predicate) for a first page. Keyset
 * (a.k.a. seek) pagination, not `OFFSET`, so a page stays stable while rows
 * are inserted or removed between requests.
 */
export function afterCursorPredicate(
  nameColumn: AnyPgColumn,
  idColumn: AnyPgColumn,
  page: ParsedPage,
) {
  if (!page.after) return undefined;
  return or(
    gt(nameColumn, page.after.name),
    and(eq(nameColumn, page.after.name), gt(idColumn, page.after.id)),
  );
}

/**
 * Splits `rows` (fetched with `LIMIT page.limit + 1`) into the page to
 * return plus the cursor for the next one. The `+1` row, if present, is
 * discarded from `items` and only used to answer "is there more?" without a
 * separate `COUNT` query.
 */
export function toPage<T extends { name: string; id: string }>(
  rows: T[],
  limit: number,
): { items: T[]; nextCursor: string | null } {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  return {
    items,
    nextCursor:
      hasMore && last ? encodeCursor({ name: last.name, id: last.id }) : null,
  };
}

/** `(name, id)` ascending — the sort order every keyset cursor above assumes. */
export function orderByNameThenId(
  nameColumn: AnyPgColumn,
  idColumn: AnyPgColumn,
) {
  return [asc(nameColumn), asc(idColumn)];
}
