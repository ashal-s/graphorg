import { and, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";

import { TeamDetails } from "@/components/directory/team-details";
import { TeamMembers } from "@/components/directory/team-members";
import {
  ResourceStats,
  type Resource,
} from "@/components/shared/resource-stats";
import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { getDb } from "@/db";
import {
  documents,
  people,
  services,
  teamMembers,
  teams,
  workflowPeople,
} from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { personPhotoSrc } from "@/lib/person-photo";
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
    teamDocuments,
    otherPeople,
  ] = await Promise.all([
    getTerminology(orgId),
    getDb().query.teams.findFirst({
      where: and(eq(teams.id, id), eq(teams.organizationId, orgId)),
    }),
    getDb().query.teamMembers.findMany({
      where: eq(teamMembers.teamId, id),
      with: { person: true },
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
          where: eq(people.organizationId, orgId),
          columns: { id: true, name: true, title: true },
          with: {
            memberships: {
              columns: { teamId: true },
              with: { team: { columns: { name: true } } },
            },
          },
          orderBy: (row, { asc }) => asc(row.name),
        }),
  ]);

  if (!team) notFound();

  // Everyone not already on this team, noting the other teams they're on.
  const candidates = otherPeople
    .filter((person) => !person.memberships.some((m) => m.teamId === id))
    .map((person) => ({
      id: person.id,
      name: person.name,
      title: person.title,
      otherTeamNames: person.memberships
        .map((m) => m.team.name)
        .sort((a, b) => a.localeCompare(b)),
    }));
  const members = teamPeople
    .filter((membership) => membership.person.organizationId === orgId)
    .map((membership) => ({
      id: membership.person.id,
      name: membership.person.name,
      title: membership.person.title,
      email: membership.person.email,
      photoUrl: personPhotoSrc(membership.person),
      teamRole: membership.teamRole,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const teamPersonIds = members.map((member) => member.id);

  // Workflows aren't owned by a team directly, only by the people on it
  // (workflow_people), so this is a second query keyed off the team's
  // member ids rather than something the relational `with` API can express
  // in one pass.
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
  const resources: Resource[] = [
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
        members={members}
        candidates={candidates}
        readOnly={readOnly}
      />

      <ResourceStats resources={resources} />
    </div>
  );
}
