import { relations } from "drizzle-orm";
import { index, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";

import { people } from "./people";
import { services } from "./services";

/**
 * People directly assigned to a service, on top of the team that owns it.
 * No `organization_id`: scoped via `service_id`/`person_id`, like the other
 * join tables.
 */
export const servicePeople = pgTable(
  "service_people",
  {
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.serviceId, table.personId] }),
    index("service_people_person_id_idx").on(table.personId),
  ],
);

export const servicePeopleRelations = relations(servicePeople, ({ one }) => ({
  service: one(services, {
    fields: [servicePeople.serviceId],
    references: [services.id],
  }),
  person: one(people, {
    fields: [servicePeople.personId],
    references: [people.id],
  }),
}));
