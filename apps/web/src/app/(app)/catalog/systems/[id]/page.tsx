import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";

import { SystemForm } from "@/components/catalog/system-form";
import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { EntityChipList } from "@/components/shared/entity-row";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDb } from "@/db";
import { services, systems, teams } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SystemDetailPage({ params }: PageProps) {
  const session = await requireSession();
  const readOnly = !hasRole(session.role, "editor");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const orgId = session.organizationId;
  const [system, teamOptions, systemServices] = await Promise.all([
    getDb().query.systems.findFirst({
      where: and(eq(systems.id, id), eq(systems.organizationId, orgId)),
      with: { ownerTeam: { columns: { id: true, name: true } } },
    }),
    getDb().query.teams.findMany({
      where: eq(teams.organizationId, orgId),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    getDb().query.services.findMany({
      where: and(eq(services.systemId, id), eq(services.organizationId, orgId)),
      with: {
        technologies: {
          with: { technology: { columns: { id: true, name: true } } },
        },
      },
      orderBy: (row, { asc }) => asc(row.name),
    }),
  ]);

  if (!system) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={system.name}
        description="Edit this system's details, or see its services below."
        align="start"
        actions={
          !readOnly && (
            <DeleteEntityButton
              entityLabel="system"
              entityName={system.name}
              apiPath={`/api/systems/${system.id}`}
              redirectTo="/catalog/systems"
            />
          )
        }
      />

      <SystemForm
        mode="edit"
        system={system}
        teams={teamOptions}
        readOnly={readOnly}
      />

      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
          <CardDescription>
            {systemServices.length === 0
              ? "This system doesn't have any services yet."
              : `${systemServices.length} service${systemServices.length === 1 ? "" : "s"} under this system.`}
          </CardDescription>
        </CardHeader>
        {systemServices.length > 0 && (
          <CardContent>
            <EntityChipList
              items={systemServices.map((service) => ({
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
    </div>
  );
}
