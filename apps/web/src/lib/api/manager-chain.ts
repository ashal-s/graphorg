import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { people } from "@/db/schema";

/** `personId -> managerId | null` for every person in an organization. */
export type ManagerChain = Map<string, string | null>;

export async function loadManagerChain(
  organizationId: string,
): Promise<ManagerChain> {
  const rows = await getDb()
    .select({ id: people.id, managerId: people.managerId })
    .from(people)
    .where(eq(people.organizationId, organizationId));

  const chain: ManagerChain = new Map();
  for (const row of rows) chain.set(row.id, row.managerId);
  return chain;
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
