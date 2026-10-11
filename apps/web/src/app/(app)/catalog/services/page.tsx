import { and, eq, ilike } from "drizzle-orm";
import Link from "next/link";
import { Layers, Plus } from "lucide-react";

import { EmptyState } from "@/components/states/empty-state";
import { EntityRow } from "@/components/shared/entity-row";
import { PageHeader } from "@/components/shared/page-header";
import { SearchBar } from "@/components/shared/search-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { getDb } from "@/db";
import { services, teams } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { lowerLabel } from "@/lib/terminology";
import { getTerminology } from "@/lib/terminology-server";

interface PageProps {
  searchParams: Promise<{ q?: string; parentId?: string; teamId?: string }>;
}

export default async function ServicesPage({ searchParams }: PageProps) {
  const session = await requireSession();
  const canEdit = hasRole(session.role, "editor");
  const { q, parentId, teamId } = await searchParams;
  const orgId = session.organizationId;
  const terms = (await getTerminology(orgId)).services;
  const singular = lowerLabel(terms.singular);
  const plural = lowerLabel(terms.plural);

  const [rows, parentOptions, teamOptions] = await Promise.all([
    getDb().query.services.findMany({
      where: and(
        eq(services.organizationId, orgId),
        q ? ilike(services.name, `%${q}%`) : undefined,
        parentId ? eq(services.parentId, parentId) : undefined,
        teamId ? eq(services.ownerTeamId, teamId) : undefined,
      ),
      with: {
        parent: { columns: { id: true, name: true } },
        children: { columns: { id: true } },
        ownerTeam: { columns: { id: true, name: true } },
        tools: {
          with: { tool: { columns: { id: true, name: true } } },
        },
      },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    // Only services that have something under them are useful to filter by.
    getDb().query.services.findMany({
      where: eq(services.organizationId, orgId),
      columns: { id: true, name: true },
      with: { children: { columns: { id: true }, limit: 1 } },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    getDb().query.teams.findMany({
      where: eq(teams.organizationId, orgId),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
  ]);

  const hasFilters = Boolean(q || parentId || teamId);
  const parents = parentOptions.filter((option) => option.children.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={terms.plural}
        description={terms.description}
        actions={
          canEdit && (
            <Button
              render={<Link href="/catalog/services/new" />}
              nativeButton={false}
            >
              <Plus aria-hidden="true" />
              New {singular}
            </Button>
          )
        }
      />

      <SearchBar defaultValue={q} placeholder={`Search ${plural}`}>
        <NativeSelect
          name="parentId"
          defaultValue={parentId ?? ""}
          className="max-w-48"
        >
          <option value="">All {plural}</option>
          {parents.map((parent) => (
            <option key={parent.id} value={parent.id}>
              Under {parent.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          name="teamId"
          defaultValue={teamId ?? ""}
          className="max-w-48"
        >
          <option value="">All teams</option>
          {teamOptions.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </NativeSelect>
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
            hasFilters ? `No ${plural} match your search` : `No ${plural} yet`
          }
          description={
            canEdit
              ? `Add a ${singular} to start building your catalog.`
              : `Nobody has added a ${singular} yet.`
          }
          action={
            canEdit &&
            !hasFilters && (
              <Button
                size="sm"
                render={<Link href="/catalog/services/new" />}
                nativeButton={false}
              >
                New {singular}
              </Button>
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((service) => (
            <EntityRow
              key={service.id}
              href={`/catalog/services/${service.id}`}
              title={service.name}
              meta={
                service.parent
                  ? `Under ${service.parent.name}`
                  : service.children.length > 0
                    ? `${service.children.length} under it`
                    : undefined
              }
              trailing={
                service.ownerTeam && (
                  <Badge variant="outline">{service.ownerTeam.name}</Badge>
                )
              }
              footer={
                service.tools.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {service.tools.map((link) => (
                      <Badge key={link.tool.id} variant="secondary">
                        {link.tool.name}
                      </Badge>
                    ))}
                  </div>
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
