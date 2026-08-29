import { and, eq, ilike } from "drizzle-orm";
import Link from "next/link";
import { Layers, Plus } from "lucide-react";

import { EmptyState } from "@/components/states/empty-state";
import { SearchBar } from "@/components/shared/search-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { getDb } from "@/db";
import { services, systems, teams } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";

interface PageProps {
  searchParams: Promise<{ q?: string; systemId?: string; teamId?: string }>;
}

export default async function ServicesPage({ searchParams }: PageProps) {
  const session = await requireSession();
  const canEdit = hasRole(session.role, "editor");
  const { q, systemId, teamId } = await searchParams;
  const orgId = session.organizationId;

  const [rows, systemOptions, teamOptions] = await Promise.all([
    getDb().query.services.findMany({
      where: and(
        eq(services.organizationId, orgId),
        q ? ilike(services.name, `%${q}%`) : undefined,
        systemId ? eq(services.systemId, systemId) : undefined,
        teamId ? eq(services.ownerTeamId, teamId) : undefined,
      ),
      with: {
        system: { columns: { id: true, name: true } },
        ownerTeam: { columns: { id: true, name: true } },
        technologies: {
          with: { technology: { columns: { id: true, name: true } } },
        },
      },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    getDb().query.systems.findMany({
      where: eq(systems.organizationId, orgId),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    getDb().query.teams.findMany({
      where: eq(teams.organizationId, orgId),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
  ]);

  const hasFilters = Boolean(q || systemId || teamId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
          <p className="text-sm text-muted-foreground">
            What&apos;s actually running, its tech stack, and its dependencies.
          </p>
        </div>
        {canEdit && (
          <Button
            render={<Link href="/catalog/services/new" />}
            nativeButton={false}
          >
            <Plus aria-hidden="true" />
            New service
          </Button>
        )}
      </div>

      <SearchBar defaultValue={q} placeholder="Search services">
        <Select
          name="systemId"
          defaultValue={systemId ?? ""}
          className="max-w-48"
        >
          <option value="">All systems</option>
          {systemOptions.map((system) => (
            <option key={system.id} value={system.id}>
              {system.name}
            </option>
          ))}
        </Select>
        <Select name="teamId" defaultValue={teamId ?? ""} className="max-w-48">
          <option value="">All teams</option>
          {teamOptions.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </Select>
      </SearchBar>

      {rows.length === 0 ? (
        <EmptyState
          icon={
            <Layers
              className="h-8 w-8 text-muted-foreground"
              aria-hidden="true"
            />
          }
          title={
            hasFilters ? "No services match your search" : "No services yet"
          }
          description={
            canEdit
              ? "Create a service to start mapping your catalog."
              : "Nobody has created a service yet."
          }
          action={
            canEdit &&
            !hasFilters && (
              <Button
                size="sm"
                render={<Link href="/catalog/services/new" />}
                nativeButton={false}
              >
                New service
              </Button>
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((service) => (
            <Link key={service.id} href={`/catalog/services/${service.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{service.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {service.system ? service.system.name : "No system"}
                      </p>
                    </div>
                    {service.ownerTeam && (
                      <Badge variant="outline" className="shrink-0">
                        {service.ownerTeam.name}
                      </Badge>
                    )}
                  </div>
                  {service.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {service.technologies.map((link) => (
                        <Badge key={link.technology.id} variant="secondary">
                          {link.technology.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
