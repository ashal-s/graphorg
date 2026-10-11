import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { tools } from "@/db/schema";

/** Distinct tool categories already used in the organization, alphabetical. */
export async function loadToolCategories(
  organizationId: string,
): Promise<string[]> {
  const rows = await getDb()
    .selectDistinct({ category: tools.category })
    .from(tools)
    .where(eq(tools.organizationId, organizationId));
  return rows.map((row) => row.category).sort((a, b) => a.localeCompare(b));
}
