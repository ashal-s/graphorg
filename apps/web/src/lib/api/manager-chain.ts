import { eq } from "drizzle-orm";

import type { Database } from "@/db";
import { people } from "@/db/schema";

/** `personId -> managerId | null` for every person in an organization. */
export type ManagerChain = Map<string, string | null>;

/**
 * Only the one query method this actually calls, not the full `Database`
 * type: a `postgres-js` transaction (`PgTransaction`) has the same
 * `.select()` as `Database` but lacks its driver-specific `$client`
 * property, so `Database` itself is too narrow to accept a `tx` argument.
 * This type is satisfied by both.
 */
type Queryable = Pick<Database, "select">;

/**
 * Takes a `Database` or an in-flight transaction (see `Queryable` above)
 * rather than calling `getDb()` itself, so a caller can load the chain and
 * act on it inside one transaction. That matters for the manager-cycle
 * check specifically: two concurrent requests each loading their own
 * snapshot outside a shared transaction could both see an acyclic graph,
 * both pass the check, and commit a cycle between them (e.g. "set A's
 * manager to B" and "set B's manager to A" racing each other).
 */
export async function loadManagerChain(
  db: Queryable,
  organizationId: string,
): Promise<ManagerChain> {
  const rows = await db
    .select({ id: people.id, managerId: people.managerId })
    .from(people)
    .where(eq(people.organizationId, organizationId));

  const chain: ManagerChain = new Map();
  for (const row of rows) chain.set(row.id, row.managerId);
  return chain;
}

/** Thrown by a caller that runs `wouldCreateManagerCycle` inside a transaction, to trigger a rollback. */
export class CircularManagerError extends Error {
  constructor() {
    super("managerId would create a circular reporting chain");
  }
}

/**
 * Whether setting `personId`'s manager to `proposedManagerId` would create a
 * cycle: walks up the chain of managers starting at `proposedManagerId` and
 * checks whether it ever reaches `personId` again. A person managing
 * themselves directly is the one-hop case of this same check.
 */
export function wouldCreateManagerCycle(
  chain: ManagerChain,
  personId: string,
  proposedManagerId: string,
): boolean {
  const seen = new Set<string>();
  let current: string | null = proposedManagerId;
  while (current !== null) {
    if (current === personId) return true;
    if (seen.has(current)) return false; // an existing, unrelated cycle: not this call's problem
    seen.add(current);
    current = chain.get(current) ?? null;
  }
  return false;
}
