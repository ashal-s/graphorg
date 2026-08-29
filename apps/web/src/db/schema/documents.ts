import { relations, sql } from "drizzle-orm";
import { check, index, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { id, organizationId, timestamps } from "./_columns";
import { organizations } from "./organizations";
import { teams } from "./teams";

export const documents = pgTable(
  "documents",
  {
    id: id(),
    organizationId: organizationId(),
    ownerTeamId: uuid("owner_team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    type: text("type", {
      enum: ["runbook", "adr", "spec", "policy", "other"],
    })
      .notNull()
      .default("other"),
    url: text("url"),
    ...timestamps(),
  },
  (table) => [
    index("documents_organization_id_idx").on(table.organizationId),
    index("documents_owner_team_id_idx").on(table.ownerTeamId),
    check(
      "documents_type_check",
      sql`${table.type} in ('runbook', 'adr', 'spec', 'policy', 'other')`,
    ),
  ],
);

export const documentsRelations = relations(documents, ({ one }) => ({
  organization: one(organizations, {
    fields: [documents.organizationId],
    references: [organizations.id],
  }),
  ownerTeam: one(teams, {
    fields: [documents.ownerTeamId],
    references: [teams.id],
  }),
}));
