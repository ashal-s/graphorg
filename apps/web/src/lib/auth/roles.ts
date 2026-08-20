import type { InferSelectModel } from "drizzle-orm";

import type { users } from "@/db/schema";

export type Role = InferSelectModel<typeof users>["role"];

/** Ranked lowest to highest so `hasRole` can compare with a single lookup. */
const ROLE_RANK: Record<Role, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  owner: 3,
};

/** Whether `actual` grants at least as much access as `minimum`. */
export function hasRole(actual: Role, minimum: Role): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[minimum];
}
