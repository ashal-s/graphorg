import { eq } from "drizzle-orm";

import { ServiceForm } from "@/components/catalog/service-form";
import { getDb } from "@/db";
import {
  repositories,
  services,
  systems,
  teams,
  technologies,
} from "@/db/schema";
import { requireRole } from "@/lib/auth/session";

export default async function NewServicePage() {
  // Creating a service is a write, and POST /api/services requires the
  // editor role: block viewers from this page entirely rather than let them
  // fill in a form that would only 403 on submit.
  const session = await requireRole("editor");
  const orgId = session.organizationId;

  const [
    systemOptions,
    repositoryOptions,
    teamOptions,
    technologyOptions,
    serviceOptions,
  ] = await Promise.all([
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
    getDb().query.services.findMany({
      where: eq(services.organizationId, orgId),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New service</h1>
        <p className="text-sm text-muted-foreground">
          Add a service to your catalog.
        </p>
      </div>
      <ServiceForm
        mode="create"
        systems={systemOptions}
        repositories={repositoryOptions}
        teams={teamOptions}
        technologies={technologyOptions}
        services={serviceOptions}
      />
    </div>
  );
}
