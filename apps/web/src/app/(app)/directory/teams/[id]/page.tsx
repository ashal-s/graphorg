import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { TeamForm } from "@/components/directory/team-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDb } from "@/db";
import { people, repositories, services, systems, teams } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamDetailPage({ params }: PageProps) {
  const session = await requireSession();
  const readOnly = !hasRole(session.role, "editor");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const orgId = session.organizationId;
  const [team, teamPeople, teamServices, teamSystems, teamRepositories] =
    await Promise.all([
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
    ]);

  if (!team) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{team.name}</h1>
          <p className="text-sm text-muted-foreground">
            Edit this team&apos;s details, or see what and who it owns below.
          </p>
        </div>
        {!readOnly && (
          <DeleteEntityButton
            entityLabel="team"
            entityName={team.name}
            apiPath={`/api/teams/${team.id}`}
            redirectTo="/directory/teams"
          />
        )}
      </div>

      <TeamForm mode="edit" team={team} readOnly={readOnly} />

      <Card>
        <CardHeader>
          <CardTitle>People</CardTitle>
          <CardDescription>
            {teamPeople.length === 0
              ? "Nobody is on this team yet."
              : `${teamPeople.length} ${teamPeople.length === 1 ? "person" : "people"} on this team.`}
          </CardDescription>
        </CardHeader>
        {teamPeople.length > 0 && (
          <CardContent className="flex flex-wrap gap-2">
            {teamPeople.map((person) => (
              <Link
                key={person.id}
                href={`/directory/people/${person.id}`}
                className="rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-muted"
              >
                {person.name}
              </Link>
            ))}
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
          <CardContent className="flex flex-col gap-2">
            {teamServices.map((service) => (
              <Link
                key={service.id}
                href={`/catalog/services/${service.id}`}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-muted"
              >
                <span className="font-medium">{service.name}</span>
                {service.technologies.map((link) => (
                  <Badge key={link.technology.id} variant="outline">
                    {link.technology.name}
                  </Badge>
                ))}
              </Link>
            ))}
          </CardContent>
        )}
      </Card>

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
          <CardContent className="flex flex-wrap gap-2">
            {teamSystems.map((system) => (
              <Link
                key={system.id}
                href={`/catalog/systems/${system.id}`}
                className="rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-muted"
              >
                {system.name}
              </Link>
            ))}
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
          <CardContent className="flex flex-wrap gap-2">
            {teamRepositories.map((repository) =>
              repository.url ? (
                <a
                  key={repository.id}
                  href={repository.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-muted"
                >
                  {repository.name}
                </a>
              ) : (
                <span
                  key={repository.id}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-sm"
                >
                  {repository.name}
                </span>
              ),
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
