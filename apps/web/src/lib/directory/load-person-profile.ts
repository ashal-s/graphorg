import { and, eq, ne } from "drizzle-orm";

import { getDb } from "@/db";
import {
  documents,
  people,
  repositories,
  services,
  teams,
  tools,
  workflowPeople,
} from "@/db/schema";

import { assemblePersonProfile } from "./person-profile";

export async function loadPersonProfile(orgId: string, personId: string) {
  const db = getDb();
  const person = await db.query.people.findFirst({
    where: and(eq(people.id, personId), eq(people.organizationId, orgId)),
    with: {
      team: { columns: { id: true, name: true } },
      manager: { columns: { id: true, name: true } },
    },
  });
  if (!person) return null;

  const teamId = person.teamId;

  const [
    teamOptions,
    managerOptions,
    directReports,
    workflowLinks,
    teamServices,
    teamRepositories,
    teamDocuments,
    orgTools,
  ] = await Promise.all([
    db.query.teams.findMany({
      where: eq(teams.organizationId, orgId),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    db.query.people.findMany({
      // Nobody can manage themselves, so this person is excluded from
      // their own manager picker.
      where: and(eq(people.organizationId, orgId), ne(people.id, personId)),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    db.query.people.findMany({
      where: and(
        eq(people.managerId, personId),
        eq(people.organizationId, orgId),
      ),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    db.query.workflowPeople.findMany({
      where: eq(workflowPeople.personId, personId),
      with: {
        workflow: {
          columns: {
            id: true,
            name: true,
            status: true,
            organizationId: true,
          },
        },
      },
    }),
    teamId
      ? db.query.services.findMany({
          where: and(
            eq(services.ownerTeamId, teamId),
            eq(services.organizationId, orgId),
          ),
          with: {
            technologies: {
              with: { technology: { columns: { id: true, name: true } } },
            },
            repository: { columns: { id: true, name: true, url: true } },
          },
          orderBy: (row, { asc }) => asc(row.name),
        })
      : Promise.resolve([]),
    teamId
      ? db.query.repositories.findMany({
          where: and(
            eq(repositories.ownerTeamId, teamId),
            eq(repositories.organizationId, orgId),
          ),
          columns: { id: true, name: true, url: true },
          orderBy: (row, { asc }) => asc(row.name),
        })
      : Promise.resolve([]),
    teamId
      ? db.query.documents.findMany({
          where: and(
            eq(documents.ownerTeamId, teamId),
            eq(documents.organizationId, orgId),
          ),
          columns: { id: true, title: true, type: true, url: true },
          orderBy: (row, { asc }) => asc(row.title),
        })
      : Promise.resolve([]),
    db.query.tools.findMany({
      where: eq(tools.organizationId, orgId),
      columns: { id: true, name: true, category: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
  ]);

  return {
    person,
    teamOptions,
    managerOptions,
    profile: assemblePersonProfile({
      team: person.team ?? null,
      manager: person.manager ?? null,
      directReports,
      workflowLinks,
      organizationId: orgId,
      services: teamServices,
      repositories: teamRepositories,
      documents: teamDocuments,
      tools: orgTools,
    }),
  };
}
