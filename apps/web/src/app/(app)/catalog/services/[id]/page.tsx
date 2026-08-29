import { and, eq, ne } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { fetchServiceDetail } from "@/app/api/services/detail";
import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import {
  ServiceForm,
  type ServiceDetail,
} from "@/components/catalog/service-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDb } from "@/db";
import {
  repositories,
  serviceDependencies,
  services,
  systems,
  teams,
  technologies,
} from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const session = await requireSession();
  const readOnly = !hasRole(session.role, "editor");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const orgId = session.organizationId;
  const [
    service,
    systemOptions,
    repositoryOptions,
    teamOptions,
    technologyOptions,
    serviceOptions,
    dependentLinks,
  ] = await Promise.all([
    fetchServiceDetail(orgId, id),
    getDb().query.systems.findMany({
      where: eq(systems.organizationId, orgId),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    getDb().query.repositories.findMany({
      where: eq(repositories.organizationId, orgId),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    getDb().query.teams.findMany({
      where: eq(teams.organizationId, orgId),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    getDb().query.technologies.findMany({
      where: eq(technologies.organizationId, orgId),
      columns: { id: true, name: true, category: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    // A service can't depend on itself, so it's excluded from its own
    // "depends on" picker.
    getDb().query.services.findMany({
      where: and(eq(services.organizationId, orgId), ne(services.id, id)),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    getDb().query.serviceDependencies.findMany({
      where: eq(serviceDependencies.dependsOnServiceId, id),
      with: { service: { columns: { id: true, name: true } } },
    }),
  ]);

  if (!service) notFound();

  const dependents = dependentLinks.map((link) => link.service);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {service.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Edit this service&apos;s details, or see how it fits the rest of the
            catalog below.
          </p>
        </div>
        {!readOnly && (
          <DeleteEntityButton
            entityLabel="service"
            entityName={service.name}
            apiPath={`/api/services/${service.id}`}
            redirectTo="/catalog/services"
          />
        )}
      </div>

      <ServiceForm
        mode="edit"
        service={service as unknown as ServiceDetail}
        systems={systemOptions}
        repositories={repositoryOptions}
        teams={teamOptions}
        technologies={technologyOptions}
        services={serviceOptions}
        readOnly={readOnly}
      />

      <Card>
        <CardHeader>
          <CardTitle>Where this fits</CardTitle>
          <CardDescription>System, repository, and owner team.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {service.system && (
            <Link
              href={`/catalog/systems/${service.system.id}`}
              className="rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-muted"
            >
              System: {service.system.name}
            </Link>
          )}
          {service.repository &&
            (service.repository.url ? (
              <a
                href={service.repository.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-muted"
              >
                Repository: {service.repository.name}
              </a>
            ) : (
              <span className="rounded-lg border border-border px-2.5 py-1.5 text-sm">
                Repository: {service.repository.name}
              </span>
            ))}
          {service.ownerTeam && (
            <Link
              href={`/directory/teams/${service.ownerTeam.id}`}
              className="rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-muted"
            >
              Team: {service.ownerTeam.name}
            </Link>
          )}
          {!service.system && !service.repository && !service.ownerTeam && (
            <p className="text-sm text-muted-foreground">
              Not linked to a system, repository, or team yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Depended on by</CardTitle>
          <CardDescription>
            {dependents.length === 0
              ? "No other services depend on this one."
              : `${dependents.length} service${dependents.length === 1 ? "" : "s"} depend on this one.`}
          </CardDescription>
        </CardHeader>
        {dependents.length > 0 && (
          <CardContent className="flex flex-wrap gap-2">
            {dependents.map((dependent) => (
              <Link
                key={dependent.id}
                href={`/catalog/services/${dependent.id}`}
                className="rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-muted"
              >
                {dependent.name}
              </Link>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
