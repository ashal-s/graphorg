import { relations } from "drizzle-orm";
import { pgTable, text } from "drizzle-orm/pg-core";

import { id, timestamps } from "./_columns";
import { documentFolders } from "./document-folders";
import { documents } from "./documents";
import { people } from "./people";
import { services } from "./services";
import { teams } from "./teams";
import { tools } from "./tools";
import { users } from "./users";
import { workflows } from "./workflows";

export const organizations = pgTable("organizations", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  logoUrl: text("logo_url"),
  /** Email domain without the "@" (e.g. "acme.com"), used to fill in new people's addresses. */
  emailDomain: text("email_domain"),
  // How this organization names, and in one line describes, the two catalog
  // concepts. Null means "use the default wording" (see lib/terminology.ts).
  servicesLabelSingular: text("services_label_singular"),
  servicesLabelPlural: text("services_label_plural"),
  servicesDescription: text("services_description"),
  toolsLabelSingular: text("tools_label_singular"),
  toolsLabelPlural: text("tools_label_plural"),
  toolsDescription: text("tools_description"),
  ...timestamps(),
});

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  teams: many(teams),
  people: many(people),
  tools: many(tools),
  services: many(services),
  documents: many(documents),
  documentFolders: many(documentFolders),
  workflows: many(workflows),
}));
