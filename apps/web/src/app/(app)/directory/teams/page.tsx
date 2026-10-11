import { and, eq, ilike } from "drizzle-orm";
import Link from "next/link";
import { Plus, Users2 } from "lucide-react";

import { EmptyState } from "@/components/states/empty-state";
import { EntityRow } from "@/components/shared/entity-row";
import { PageHeader } from "@/components/shared/page-header";
import { SearchBar } from "@/components/shared/search-bar";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { teams } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function TeamsPage({ searchParams }: PageProps) {
  const session = await requireSession();
  const canEdit = hasRole(session.role, "editor");
  const { q } = await searchParams;

  const rows = await getDb().query.teams.findMany({
    where: and(
      eq(teams.organizationId, session.organizationId),
      q ? ilike(teams.name, `%${q}%`) : undefined,
    ),
    with: { memberships: { columns: { personId: true } } },
    orderBy: (row, { asc }) => asc(row.name),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Teams"
        description="Who owns what across your organisation."
        actions={
          canEdit && (
            <Button
              render={<Link href="/directory/teams/new" />}
              nativeButton={false}
            >
              <Plus aria-hidden="true" />
              New team
            </Button>
          )
        }
      />

      <SearchBar defaultValue={q} placeholder="Search teams" />

      {rows.length === 0 ? (
        <EmptyState
          icon={
            <Users2
              className="h-8 w-8 text-muted-foreground"
              aria-hidden="true"
            />
          }
          title={q ? "No teams match your search" : "No teams yet"}
          description={
            canEdit
              ? "Create a team to start organising people and ownership."
              : "Nobody has created a team yet."
          }
          action={
            canEdit &&
            !q && (
              <Button
                size="sm"
                render={<Link href="/directory/teams/new" />}
                nativeButton={false}
              >
                New team
              </Button>
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((team) => (
            <EntityRow
              key={team.id}
              href={`/directory/teams/${team.id}`}
              title={team.name}
              meta={team.description}
              trailing={
                <p className="text-sm text-muted-foreground">
                  {team.memberships.length}{" "}
                  {team.memberships.length === 1 ? "person" : "people"}
                </p>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
