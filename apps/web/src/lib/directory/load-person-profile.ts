import { and, eq, inArray, ne, or } from "drizzle-orm";

import { getDb } from "@/db";
import {
  documents,
  people,
  servicePeople,
  services,
  teams,
  workflowPeople,
  workflows,
} from "@/db/schema";

import { assemblePersonProfile } from "./person-profile";

export async function loadPersonProfile(
  orgId: string,
  personId: string,
  /** Also load the workflows and services someone could be assigned to. */
  options: { withAssignOptions?: boolean } = {},
) {
  const db = getDb();
  const person = await db.query.people.findFirst({
    where: and(eq(people.id, personId), eq(people.organizationId, orgId)),
    with: {
      memberships: {
        columns: {},
        with: { team: { columns: { id: true, name: true, slug: true } } },
      },
      manager: { columns: { id: true, name: true, slug: true } },
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
    directServiceRows,
    workflowOptions,
    serviceOptions,
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
      columns: { id: true, name: true, slug: true },
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
    // Services the person's teams own, plus any assigned to them directly.
    db.query.services.findMany({
      where: and(
        eq(services.organizationId, orgId),
        or(
          teamIds.length > 0
            ? inArray(services.ownerTeamId, teamIds)
            : undefined,
          inArray(
            services.id,
            db
              .select({ id: servicePeople.serviceId })
              .from(servicePeople)
              .where(eq(servicePeople.personId, personId)),
          ),
        ),
      ),
      with: {
        tools: {
          with: {
            tool: { columns: { id: true, name: true, category: true } },
          },
        },
      },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    // Documents owned by one of their teams, or assigned to them directly.
    db.query.documents.findMany({
      where: and(
        eq(documents.organizationId, orgId),
        or(
          teamIds.length > 0
            ? inArray(documents.ownerTeamId, teamIds)
            : undefined,
          eq(documents.ownerPersonId, personId),
        ),
      ),
      columns: { id: true, title: true, type: true, url: true },
      orderBy: (row, { asc }) => asc(row.title),
    }),
    db.query.servicePeople.findMany({
      where: eq(servicePeople.personId, personId),
      columns: { serviceId: true },
    }),
    options.withAssignOptions
      ? db.query.workflows.findMany({
          where: eq(workflows.organizationId, orgId),
          columns: { id: true, name: true },
          orderBy: (row, { asc }) => asc(row.name),
        })
      : Promise.resolve([]),
    options.withAssignOptions
      ? db.query.services.findMany({
          where: eq(services.organizationId, orgId),
          columns: { id: true, name: true },
          orderBy: (row, { asc }) => asc(row.name),
        })
      : Promise.resolve([]),
  ]);

  const directServiceIds = new Set(directServiceRows.map((r) => r.serviceId));

  const { memberships: _memberships, ...personFields } = person;
  void _memberships;

  return {
    person: { ...personFields, teamIds },
    teamOptions,
    managerOptions,
    workflowOptions,
    serviceOptions,
    profile: assemblePersonProfile({
      teams: personTeams,
      manager: person.manager ?? null,
      directReports,
      workflowLinks,
      organizationId: orgId,
      services: teamServices.map((service) => ({
        ...service,
        direct: directServiceIds.has(service.id),
      })),
      documents: teamDocuments,
    }),
  };
}
