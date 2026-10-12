import { sql } from "drizzle-orm";

import type { Database } from "@/db";

/** Anything that can run raw SQL; in practice a transaction. */
type Exec = Pick<Database, "execute">;

/**
 * Serializes whatever runs next in this transaction against every other
 * transaction that takes the same `scope` for the same organization. The
 * lock is held until the transaction commits or rolls back.
 *
 * It exists for read-check-write sequences the database can't enforce with a
 * constraint: "is this slug free?", "would this parent loop?". Without it,
 * two concurrent requests each read the old state, both pass the check, and
 * both commit. Reads that follow the lock see everything committed before it
 * was granted (READ COMMITTED), so the second request sees the first's write.
 *
 * Use one `scope` per invariant, so unrelated checks don't wait on each other.
 */
export async function lockOrganization(
  tx: Exec,
  organizationId: string,
  scope: string,
): Promise<void> {
  await lockResource(tx, scope, organizationId);
}

/**
 * The same lock for any other key, e.g. one person's primary links. Locks
 * are held until the transaction ends, so when taking several, take them in
 * a consistent order (sorted ids) to avoid two requests waiting on each other.
 */
export async function lockResource(
  tx: Exec,
  scope: string,
  key: string,
): Promise<void> {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext(${`${scope}:${key}`}))`,
  );
}
