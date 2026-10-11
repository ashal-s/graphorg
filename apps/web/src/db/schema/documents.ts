import { relations, sql } from "drizzle-orm";
import { check, index, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { id, organizationId, timestamps } from "./_columns";
import { documentFolders } from "./document-folders";
import { organizations } from "./organizations";
import { people } from "./people";
import { teams } from "./teams";

export const documents = pgTable(
  "documents",
  {
    id: id(),
    organizationId: organizationId(),
    ownerTeamId: uuid("owner_team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    folderId: uuid("folder_id").references(() => documentFolders.id, {
      onDelete: "set null",
    }),
    ownerPersonId: uuid("owner_person_id").references(() => people.id, {
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
    index("documents_folder_id_idx").on(table.folderId),
    index("documents_owner_person_id_idx").on(table.ownerPersonId),
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
  ownerPerson: one(people, {
    fields: [documents.ownerPersonId],
    references: [people.id],
  }),
  folder: one(documentFolders, {
    fields: [documents.folderId],
    references: [documentFolders.id],
  }),
}));
