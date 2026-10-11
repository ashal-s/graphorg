import { and, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";

import { TeamDetails } from "@/components/directory/team-details";
import { TeamMembers } from "@/components/directory/team-members";
import {
  TeamResources,
  type TeamResource,
} from "@/components/directory/team-resources";
import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { getDb } from "@/db";
import {
  documents,
  people,
  repositories,
  services,
  teams,
  workflowPeople,
} from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { lowerLabel } from "@/lib/terminology";
import { getTerminology } from "@/lib/terminology-server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamDetailPage({ params }: PageProps) {
  const session = await requireSession();
  const readOnly = !hasRole(session.role, "editor");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const orgId = session.organizationId;
  const [
    terminology,
    team,
    teamPeople,
    teamServices,
    teamRepositories,
    teamDocuments,
    otherPeople,
  ] = await Promise.all([
    getTerminology(orgId),
    getDb().query.teams.findFirst({
      where: and(eq(teams.id, id), eq(teams.organizationId, orgId)),
    }),
    getDb().query.people.findMany({
      where: and(eq(people.teamId, id), eq(people.organizationId, orgId)),
      orderBy: (row, { asc }) => asc(row.name),
    }),
    getDb().query.services.findMany({
      where: and(
        eq(services.ownerTeamId, id),
        eq(services.organizationId, orgId),
      ),
      with: {
        tools: {
          with: { tool: { columns: { id: true, name: true } } },
        },
      },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    getDb().query.repositories.findMany({
      where: and(
        eq(repositories.ownerTeamId, id),
        eq(repositories.organizationId, orgId),
      ),
      orderBy: (row, { asc }) => asc(row.name),
    }),
    getDb().query.documents.findMany({
      where: and(
        eq(documents.ownerTeamId, id),
        eq(documents.organizationId, orgId),
      ),
      orderBy: (row, { asc }) => asc(row.title),
    }),
    // Everyone not already on this team, for the "Add people" picker.
    // Skipped for read-only viewers, who can't add anyone.
    readOnly
      ? Promise.resolve([])
      : getDb().query.people.findMany({
          where: and(
            eq(people.organizationId, orgId),
            or(isNull(people.teamId), ne(people.teamId, id)),
          ),
          columns: { id: true, name: true, title: true },
          with: { team: { columns: { name: true } } },
          orderBy: (row, { asc }) => asc(row.name),
        }),
  ]);

  if (!team) notFound();

  const candidates = otherPeople.map((person) => ({
    id: person.id,
    name: person.name,
    title: person.title,
    currentTeamName: person.team?.name ?? null,
  }));

  // Workflows aren't owned by a team directly, only by the people on it
  // (workflow_people), so this is a second query keyed off the team's
  // member ids rather than something the relational `with` API can express
  // in one pass.
  const teamPersonIds = teamPeople.map((person) => person.id);
  const workflowAssignments = teamPersonIds.length
    ? await getDb().query.workflowPeople.findMany({
        where: inArray(workflowPeople.personId, teamPersonIds),
        with: {
          workflow: { columns: { id: true, name: true, status: true } },
          person: { columns: { id: true, name: true } },
        },
      })
    : [];

  const teamWorkflowsById = new Map<
    string,
    {
      id: string;
      name: string;
      status: string;
      members: Array<{ personId: string; name: string; role: string }>;
    }
  >();
  for (const assignment of workflowAssignments) {
    const member = {
      personId: assignment.person.id,
      name: assignment.person.name,
      role: assignment.role,
    };
    const existing = teamWorkflowsById.get(assignment.workflow.id);
    if (existing) {
      existing.members.push(member);
    } else {
      teamWorkflowsById.set(assignment.workflow.id, {
        id: assignment.workflow.id,
        name: assignment.workflow.name,
        status: assignment.workflow.status,
        members: [member],
      });
    }
  }
  const teamWorkflows = Array.from(teamWorkflowsById.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const teamToolsById = new Map<string, string>();
  for (const service of teamServices) {
    for (const link of service.tools) {
      teamToolsById.set(link.tool.id, link.tool.name);
    }
  }
  const teamTools = Array.from(teamToolsById.entries())
    .map(([toolId, name]) => ({ id: toolId, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const serviceTerms = terminology.services;
  const toolTerms = terminology.tools;

  const canCreate = !readOnly;
  const resources: TeamResource[] = [
    {
      key: "services",
      label: serviceTerms.plural,
      singular: lowerLabel(serviceTerms.singular),
      emptyText: `This team doesn't own any ${lowerLabel(serviceTerms.plural)}.`,
      addHref: canCreate
        ? `/catalog/services/new?teamId=${team.id}`
        : undefined,
      items: teamServices.map((service) => ({
        id: service.id,
        name: service.name,
        href: `/catalog/services/${service.id}`,
        editHref: canCreate ? `/catalog/services/${service.id}` : undefined,
        badges: service.tools.map((link) => link.tool.name),
      })),
    },
    {
      key: "workflows",
      label: "Workflows",
      singular: "workflow",
      emptyText: "Nobody on this team is involved in a workflow.",
      addHref: canCreate ? "/workflows/new" : undefined,
      items: teamWorkflows.map((workflow) => ({
        id: workflow.id,
        name: workflow.name,
        href: `/workflows/${workflow.id}`,
        editHref: canCreate ? `/workflows/${workflow.id}` : undefined,
        badges: [workflow.status],
      })),
    },
    {
      key: "tools",
      label: toolTerms.plural,
      singular: lowerLabel(toolTerms.singular),
      emptyText: `This team's ${lowerLabel(serviceTerms.plural)} don't use any ${lowerLabel(toolTerms.plural)} yet.`,
      items: teamTools.map((tool) => ({
        id: tool.id,
        name: tool.name,
        href: `/catalog/tools/${tool.id}`,
      })),
    },
    {
      key: "documents",
      label: "Documents",
      singular: "document",
      emptyText: "This team doesn't own any documents.",
      items: teamDocuments.map((document) => ({
        id: document.id,
        name: document.title,
        href: `/catalog/documents/${document.id}`,
        badges: [document.type],
      })),
    },
    {
      key: "repositories",
      label: "Repositories",
      singular: "repository",
      emptyText: "This team doesn't own any repositories.",
      items: teamRepositories.map((repository) => ({
        id: repository.id,
        name: repository.name,
        href: `/catalog/repositories/${repository.id}`,
      })),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <TeamDetails
        team={team}
        readOnly={readOnly}
        actions={
          !readOnly && (
            <DeleteEntityButton
              entityLabel="team"
              entityName={team.name}
              apiPath={`/api/teams/${team.id}`}
              redirectTo="/directory/teams"
            />
          )
        }
      />

      <TeamMembers
        teamId={team.id}
        members={teamPeople.map((person) => ({
          id: person.id,
          name: person.name,
          title: person.title,
          email: person.email,
          teamRole: person.teamRole,
        }))}
        candidates={candidates}
        readOnly={readOnly}
      />

      <TeamResources resources={resources} />
    </div>
  );
}
