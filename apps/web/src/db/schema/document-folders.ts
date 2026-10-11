import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { id, organizationId, timestamps } from "./_columns";
import { documents } from "./documents";
import { organizations } from "./organizations";

/**
 * A folder documents can be filed in. Folders nest through `parent_id`;
 * deleting one moves its contents up a level (done by the API), so the
 * database only clears the link.
 */
export const documentFolders = pgTable(
  "document_folders",
  {
    id: id(),
    organizationId: organizationId(),
    parentId: uuid("parent_id").references(
      (): AnyPgColumn => documentFolders.id,
      { onDelete: "set null" },
    ),
    name: text("name").notNull(),
    ...timestamps(),
  },
  (table) => [
    index("document_folders_organization_id_idx").on(table.organizationId),
    index("document_folders_parent_id_idx").on(table.parentId),
  ],
);

export const documentFoldersRelations = relations(
  documentFolders,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [documentFolders.organizationId],
      references: [organizations.id],
    }),
    parent: one(documentFolders, {
      fields: [documentFolders.parentId],
      references: [documentFolders.id],
      relationName: "parent",
    }),
    children: many(documentFolders, { relationName: "parent" }),
    documents: many(documents),
  }),
);
