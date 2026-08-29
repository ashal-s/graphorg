import { sql } from "drizzle-orm";
import { timestamp, uuid } from "drizzle-orm/pg-core";

import { organizations } from "./organizations";

/** Fresh builder per call: Drizzle column builders can't be shared across tables. */
export const id = () =>
  uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`);

export const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Every tenant-scoped table's boundary column: required, cascades with the org. */
export const organizationId = () =>
  uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" });
