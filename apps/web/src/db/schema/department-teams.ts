import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  primaryKey,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { departments } from "./departments";
import { teams } from "./teams";

/**
 * Which departments a team is in. A team can be in several, or none; at most
 * one of its rows is the primary department. No `organization_id`: scoped via
 * `department_id`/`team_id`, like the other join tables.
 */
export const departmentTeams = pgTable(
  "department_teams",
  {
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (table) => [
    primaryKey({ columns: [table.departmentId, table.teamId] }),
    index("department_teams_team_id_idx").on(table.teamId),
    uniqueIndex("department_teams_one_primary_per_team")
      .on(table.teamId)
      .where(sql`${table.isPrimary}`),
  ],
);

export const departmentTeamsRelations = relations(
  departmentTeams,
  ({ one }) => ({
    department: one(departments, {
      fields: [departmentTeams.departmentId],
      references: [departments.id],
    }),
    team: one(teams, {
      fields: [departmentTeams.teamId],
      references: [teams.id],
    }),
  }),
);
