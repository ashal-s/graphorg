import { and, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";

import { TeamDetails } from "@/components/directory/team-details";
import { TeamMembers } from "@/components/directory/team-members";
import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { EntityChipList, EntityRow } from "@/components/shared/entity-row";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDb } from "@/db";
import {
  documents,
  people,
  repositories,
  services,
  systems,
  teams,
  workflowPeople,
} from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  draft: "outline",
  active: "default",
  archived: "secondary",
};

export default async function TeamDetailPage({ params }: PageProps) {
  const session = await requireSession();
  const readOnly = !hasRole(session.role, "editor");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const orgId = session.organizationId;
  const [
    team,
    teamPeople,
    teamServices,
    teamSystems,
    teamRepositories,
    teamDocuments,
    otherPeople,
  ] = await Promise.all([
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
        technologies: {
          with: { technology: { columns: { id: true, name: true } } },
        },
      },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    getDb().query.systems.findMany({
      where: and(
        eq(systems.ownerTeamId, id),
        eq(systems.organizationId, orgId),
      ),
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

  const teamTechnologiesById = new Map<string, string>();
  for (const service of teamServices) {
    for (const link of service.technologies) {
      teamTechnologiesById.set(link.technology.id, link.technology.name);
    }
  }
  const teamTechnologies = Array.from(teamTechnologiesById.entries())
    .map(([techId, name]) => ({ id: techId, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

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
        }))}
        candidates={candidates}
        readOnly={readOnly}
      />

      <Card>
        <CardHeader>
          <CardTitle>Systems</CardTitle>
          <CardDescription>
            {teamSystems.length === 0
              ? "This team doesn't own any systems."
              : `${teamSystems.length} system${teamSystems.length === 1 ? "" : "s"} owned by this team.`}
          </CardDescription>
        </CardHeader>
        {teamSystems.length > 0 && (
          <CardContent>
            <EntityChipList
              items={teamSystems.map((system) => ({
                key: system.id,
                href: `/catalog/systems/${system.id}`,
                label: system.name,
              }))}
            />
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
          <CardDescription>
            {teamServices.length === 0
              ? "This team doesn't own any services."
              : `${teamServices.length} service${teamServices.length === 1 ? "" : "s"} owned by this team.`}
          </CardDescription>
        </CardHeader>
        {teamServices.length > 0 && (
          <CardContent>
            <EntityChipList
              items={teamServices.map((service) => ({
                key: service.id,
                href: `/catalog/services/${service.id}`,
                label: (
                  <>
                    <span className="font-medium">{service.name}</span>
                    {service.technologies.map((link) => (
                      <Badge key={link.technology.id} variant="outline">
                        {link.technology.name}
                      </Badge>
                    ))}
                  </>
                ),
              }))}
            />
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workflows</CardTitle>
          <CardDescription>
            {teamWorkflows.length === 0
              ? "Nobody on this team is involved in a workflow."
              : `${teamWorkflows.length} workflow${teamWorkflows.length === 1 ? "" : "s"} this team is involved in.`}
          </CardDescription>
        </CardHeader>
        {teamWorkflows.length > 0 && (
          <CardContent className="flex flex-col gap-2">
            {teamWorkflows.map((workflow) => (
              <EntityRow
                key={workflow.id}
                href={`/workflows/${workflow.id}`}
                title={workflow.name}
                titleBadge={
                  <Badge variant={STATUS_VARIANT[workflow.status] ?? "outline"}>
                    {workflow.status}
                  </Badge>
                }
                footer={
                  <div className="flex flex-wrap gap-1.5">
                    {workflow.members.map((member) => (
                      <Badge
                        key={`${member.personId}-${member.role}`}
                        variant="outline"
                      >
                        {member.name} · {member.role}
                      </Badge>
                    ))}
                  </div>
                }
              />
            ))}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Technologies</CardTitle>
          <CardDescription>
            {teamTechnologies.length === 0
              ? "This team's services don't use any technologies yet."
              : `${teamTechnologies.length} technolog${teamTechnologies.length === 1 ? "y" : "ies"} used across this team's services.`}
          </CardDescription>
        </CardHeader>
        {teamTechnologies.length > 0 && (
          <CardContent className="flex flex-wrap gap-2">
            {teamTechnologies.map((technology) => (
              <Badge key={technology.id} variant="secondary">
                {technology.name}
              </Badge>
            ))}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            {teamDocuments.length === 0
              ? "This team doesn't own any documents."
              : `${teamDocuments.length} document${teamDocuments.length === 1 ? "" : "s"} owned by this team.`}
          </CardDescription>
        </CardHeader>
        {teamDocuments.length > 0 && (
          <CardContent>
            <EntityChipList
              items={teamDocuments.map((document) => ({
                key: document.id,
                href: document.url ?? undefined,
                external: true,
                label: (
                  <>
                    <span className="font-medium">{document.title}</span>
                    <Badge variant="outline">{document.type}</Badge>
                  </>
                ),
              }))}
            />
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Repositories</CardTitle>
          <CardDescription>
            {teamRepositories.length === 0
              ? "This team doesn't own any repositories."
              : `${teamRepositories.length} repositor${teamRepositories.length === 1 ? "y" : "ies"} owned by this team.`}
          </CardDescription>
        </CardHeader>
        {teamRepositories.length > 0 && (
          <CardContent>
            <EntityChipList
              items={teamRepositories.map((repository) => ({
                key: repository.id,
                href: repository.url ?? undefined,
                external: true,
                label: repository.name,
              }))}
            />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
