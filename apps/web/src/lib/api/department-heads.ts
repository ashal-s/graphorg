import { and, eq, notInArray } from "drizzle-orm";

import type { Database } from "@/db";
import { departmentHeads } from "@/db/schema";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Makes `personIds` exactly the heads of `departmentId`. */
export async function setDepartmentHeads(
  tx: Tx,
  departmentId: string,
  personIds: string[],
): Promise<void> {
  const unique = [...new Set(personIds)];

  if (unique.length === 0) {
    await tx
      .delete(departmentHeads)
      .where(eq(departmentHeads.departmentId, departmentId));
    return;
  }

  await tx
    .delete(departmentHeads)
    .where(
      and(
        eq(departmentHeads.departmentId, departmentId),
        notInArray(departmentHeads.personId, unique),
      ),
    );
  await tx
    .insert(departmentHeads)
    .values(unique.map((personId) => ({ departmentId, personId })))
    .onConflictDoNothing();
}
