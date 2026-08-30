import { and, eq, ne } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";

import { fetchServiceDetail } from "@/app/api/services/detail";
import {
  ServiceForm,
  type ServiceDetail,
} from "@/components/catalog/service-form";
import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { EntityChipList } from "@/components/shared/entity-row";
import { PageHeader } from "@/components/shared/page-header";
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
      <PageHeader
        title={service.name}
        description="Edit this service's details, or see how it fits the rest of the catalog below."
        align="start"
        actions={
          !readOnly && (
            <DeleteEntityButton
              entityLabel="service"
              entityName={service.name}
              apiPath={`/api/services/${service.id}`}
              redirectTo="/catalog/services"
            />
          )
        }
      />

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
        <CardContent>
          {!service.system && !service.repository && !service.ownerTeam ? (
            <p className="text-sm text-muted-foreground">
              Not linked to a system, repository, or team yet.
            </p>
          ) : (
            <EntityChipList
              items={[
                ...(service.system
                  ? [
                      {
                        key: "system",
                        href: `/catalog/systems/${service.system.id}`,
                        label: `System: ${service.system.name}`,
                      },
                    ]
                  : []),
                ...(service.repository
                  ? [
                      {
                        key: "repository",
                        href: service.repository.url ?? undefined,
                        external: Boolean(service.repository.url),
                        label: `Repository: ${service.repository.name}`,
                      },
                    ]
                  : []),
                ...(service.ownerTeam
                  ? [
                      {
                        key: "team",
                        href: `/directory/teams/${service.ownerTeam.id}`,
                        label: `Team: ${service.ownerTeam.name}`,
                      },
                    ]
                  : []),
              ]}
            />
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
          <CardContent>
            <EntityChipList
              items={dependents.map((dependent) => ({
                key: dependent.id,
                href: `/catalog/services/${dependent.id}`,
                label: dependent.name,
              }))}
            />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
