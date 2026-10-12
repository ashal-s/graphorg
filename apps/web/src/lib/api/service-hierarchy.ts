import { eq } from "drizzle-orm";

import { getDb, type Database } from "@/db";
import { services } from "@/db/schema";

/** `serviceId -> parentId` for services that have a parent. */
export type ParentMap = Map<string, string>;

/**
 * True if making `parentId` the parent of `serviceId` would put a service
 * under itself: `parentId` is `serviceId`, or `serviceId` is one of
 * `parentId`'s ancestors. Bounded so a cycle already in the data can't hang.
 */
export function wouldCreateParentCycle(
  parents: ParentMap,
  serviceId: string,
  parentId: string,
): boolean {
  let current: string | undefined = parentId;
  for (let hops = 0; current !== undefined && hops <= parents.size; hops++) {
    if (current === serviceId) return true;
    current = parents.get(current);
  }
  return false;
}

/** Thrown inside a transaction when a parent change would form a loop. */
export class ParentCycleError extends Error {
  constructor(message = "parentId would create a loop") {
    super(message);
  }
}

/**
 * Pass a transaction as `db` to read the map inside it, after taking
 * `lockOrganization`, so the check and the write can't race another request.
 */
export async function loadParentMap(
  organizationId: string,
  db: Pick<Database, "select"> = getDb(),
): Promise<ParentMap> {
  const rows = await db
    .select({ id: services.id, parentId: services.parentId })
    .from(services)
    .where(eq(services.organizationId, organizationId));

  const parents: ParentMap = new Map();
  for (const row of rows) {
    if (row.parentId) parents.set(row.id, row.parentId);
  }
  return parents;
}
