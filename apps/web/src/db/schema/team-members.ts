import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  primaryKey,
  text,
  uuid,
} from "drizzle-orm/pg-core";

import { people } from "./people";
import { teams } from "./teams";

/**
 * Which teams a person is on, and at what level on each. A person can be on
 * any number of teams. Any number of leads per team is fine: leads are peers.
 * No `organization_id`: scoped via `team_id`/`person_id`, like the other
 * join tables.
 */
export const teamMembers = pgTable(
  "team_members",
  {
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    teamRole: text("team_role", { enum: ["lead", "member", "trainee"] })
      .notNull()
      .default("member"),
  },
  (table) => [
    primaryKey({ columns: [table.teamId, table.personId] }),
    index("team_members_person_id_idx").on(table.personId),
    check(
      "team_members_team_role_check",
      sql`${table.teamRole} in ('lead', 'member', 'trainee')`,
    ),
  ],
);

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  person: one(people, {
    fields: [teamMembers.personId],
    references: [people.id],
  }),
}));
