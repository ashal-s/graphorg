import { relations } from "drizzle-orm";
import { pgTable, text } from "drizzle-orm/pg-core";

import { id, timestamps } from "./_columns";
import { documents } from "./documents";
import { people } from "./people";
import { repositories } from "./repositories";
import { services } from "./services";
import { systems } from "./systems";
import { teams } from "./teams";
import { technologies } from "./technologies";
import { tools } from "./tools";
import { users } from "./users";
import { workflows } from "./workflows";

export const organizations = pgTable("organizations", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  logoUrl: text("logo_url"),
  ...timestamps(),
});

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  teams: many(teams),
  people: many(people),
  technologies: many(technologies),
  tools: many(tools),
  systems: many(systems),
  services: many(services),
  repositories: many(repositories),
  documents: many(documents),
  workflows: many(workflows),
}));
