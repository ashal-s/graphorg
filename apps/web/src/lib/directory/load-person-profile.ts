import { and, eq, inArray, ne } from "drizzle-orm";

import { getDb } from "@/db";
import {
  documents,
  people,
  services,
  teams,
  workflowPeople,
} from "@/db/schema";

import { assemblePersonProfile } from "./person-profile";

export async function loadPersonProfile(orgId: string, personId: string) {
  const db = getDb();
  const person = await db.query.people.findFirst({
    where: and(eq(people.id, personId), eq(people.organizationId, orgId)),
    with: {
      memberships: {
        columns: {},
        with: { team: { columns: { id: true, name: true } } },
      },
      manager: { columns: { id: true, name: true } },
    },
  });
  if (!person) return null;

  const personTeams = person.memberships
    .map((membership) => membership.team)
    .sort((a, b) => a.name.localeCompare(b.name));
  const teamIds = personTeams.map((team) => team.id);

  const [
    teamOptions,
    managerOptions,
    directReports,
    workflowLinks,
    teamServices,
    teamDocuments,
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
    teamIds.length > 0
      ? db.query.services.findMany({
          where: and(
            inArray(services.ownerTeamId, teamIds),
            eq(services.organizationId, orgId),
          ),
          with: {
            tools: {
              with: {
                tool: { columns: { id: true, name: true, category: true } },
              },
            },
          },
          orderBy: (row, { asc }) => asc(row.name),
        })
      : Promise.resolve([]),
    teamIds.length > 0
      ? db.query.documents.findMany({
          where: and(
            inArray(documents.ownerTeamId, teamIds),
            eq(documents.organizationId, orgId),
          ),
          columns: { id: true, title: true, type: true, url: true },
          orderBy: (row, { asc }) => asc(row.title),
        })
      : Promise.resolve([]),
  ]);

  const { memberships: _memberships, ...personFields } = person;
  void _memberships;

  return {
    person: { ...personFields, teamIds },
    teamOptions,
    managerOptions,
    profile: assemblePersonProfile({
      teams: personTeams,
      manager: person.manager ?? null,
      directReports,
      workflowLinks,
      organizationId: orgId,
      services: teamServices,
      documents: teamDocuments,
    }),
  };
}
