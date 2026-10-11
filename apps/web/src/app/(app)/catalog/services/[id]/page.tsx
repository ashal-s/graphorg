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
  teams,
  tools,
} from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { lowerLabel } from "@/lib/terminology";
import { getTerminology } from "@/lib/terminology-server";

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
    terminology,
    repositoryOptions,
    teamOptions,
    toolOptions,
    serviceOptions,
    dependentLinks,
  ] = await Promise.all([
    fetchServiceDetail(orgId, id),
    getTerminology(orgId),
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
    getDb().query.tools.findMany({
      where: eq(tools.organizationId, orgId),
      columns: { id: true, name: true, category: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    // A service can't depend on itself, so it's excluded from its own
    // "depends on" picker.
    getDb().query.services.findMany({
      where: and(eq(services.organizationId, orgId), ne(services.id, id)),
      columns: { id: true, name: true, parentId: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    getDb().query.serviceDependencies.findMany({
      where: eq(serviceDependencies.dependsOnServiceId, id),
      with: { service: { columns: { id: true, name: true } } },
    }),
  ]);

  if (!service) notFound();

  const dependents = dependentLinks.map((link) => link.service);

  // A service can't sit under itself or anything beneath it.
  const beneath = new Set<string>([id]);
  for (let grew = true; grew;) {
    grew = false;
    for (const option of serviceOptions) {
      if (option.parentId && beneath.has(option.parentId)) {
        if (!beneath.has(option.id)) {
          beneath.add(option.id);
          grew = true;
        }
      }
    }
  }
  const parentOptions = serviceOptions.filter(
    (option) => !beneath.has(option.id),
  );

  const serviceTerms = terminology.services;
  const singular = lowerLabel(serviceTerms.singular);
  const plural = lowerLabel(serviceTerms.plural);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={service.name}
        description={`Edit this ${singular}'s details, or see how it fits the rest of the catalog below.`}
        align="start"
        actions={
          !readOnly && (
            <DeleteEntityButton
              entityLabel={singular}
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
        terminology={terminology}
        parents={parentOptions}
        repositories={repositoryOptions}
        teams={teamOptions}
        tools={toolOptions}
        services={serviceOptions}
        readOnly={readOnly}
      />

      <Card>
        <CardHeader>
          <CardTitle>Where this fits</CardTitle>
          <CardDescription>
            What it sits under, its repository, and owner team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!service.parent && !service.repository && !service.ownerTeam ? (
            <p className="text-sm text-muted-foreground">
              Not linked to a parent, repository, or team yet.
            </p>
          ) : (
            <EntityChipList
              items={[
                ...(service.parent
                  ? [
                      {
                        key: "parent",
                        href: `/catalog/services/${service.parent.id}`,
                        label: `Part of: ${service.parent.name}`,
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

      {service.children.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Includes</CardTitle>
            <CardDescription>
              {service.children.length} {plural} under this {singular}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EntityChipList
              items={service.children
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((child) => ({
                  key: child.id,
                  href: `/catalog/services/${child.id}`,
                  label: child.name,
                }))}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Depended on by</CardTitle>
          <CardDescription>
            {dependents.length === 0
              ? `No other ${plural} depend on this one.`
              : `${dependents.length} ${dependents.length === 1 ? singular : plural} depend on this one.`}
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
