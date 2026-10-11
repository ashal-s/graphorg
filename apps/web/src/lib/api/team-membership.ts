import { and, eq, notInArray } from "drizzle-orm";

import type { Database } from "@/db";
import { teamMembers } from "@/db/schema";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Makes `teamIds` exactly the set of teams `personId` is on. Teams they stay
 * on keep their level; newly added ones start as plain members.
 */
export async function setPersonTeams(
  tx: Tx,
  personId: string,
  teamIds: string[],
): Promise<void> {
  const unique = [...new Set(teamIds)];

  if (unique.length === 0) {
    await tx.delete(teamMembers).where(eq(teamMembers.personId, personId));
    return;
  }

  await tx
    .delete(teamMembers)
    .where(
      and(
        eq(teamMembers.personId, personId),
        notInArray(teamMembers.teamId, unique),
      ),
    );
  await tx
    .insert(teamMembers)
    .values(unique.map((teamId) => ({ teamId, personId })))
    .onConflictDoNothing();
}
