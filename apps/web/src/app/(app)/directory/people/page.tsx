import { and, eq, ilike, inArray, or } from "drizzle-orm";
import Link from "next/link";
import { Plus, Users } from "lucide-react";

import { EmptyState } from "@/components/states/empty-state";
import { EntityRow } from "@/components/shared/entity-row";
import { PageHeader } from "@/components/shared/page-header";
import { SearchBar } from "@/components/shared/search-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { getDb } from "@/db";
import { people, teamMembers, teams } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";

interface PageProps {
  searchParams: Promise<{ q?: string; teamId?: string }>;
}

export default async function PeoplePage({ searchParams }: PageProps) {
  const session = await requireSession();
  const canEdit = hasRole(session.role, "editor");
  const { q, teamId } = await searchParams;
  const orgId = session.organizationId;

  const [rows, teamOptions] = await Promise.all([
    getDb().query.people.findMany({
      where: and(
        eq(people.organizationId, orgId),
        q
          ? or(ilike(people.name, `%${q}%`), ilike(people.email, `%${q}%`))
          : undefined,
        teamId
          ? inArray(
              people.id,
              getDb()
                .select({ id: teamMembers.personId })
                .from(teamMembers)
                .where(eq(teamMembers.teamId, teamId)),
            )
          : undefined,
      ),
      with: {
        memberships: {
          columns: {},
          with: { team: { columns: { id: true, name: true } } },
        },
      },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    getDb().query.teams.findMany({
      where: eq(teams.organizationId, orgId),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
  ]);

  const hasFilters = Boolean(q || teamId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="People"
        description="Everyone in your organisation's directory."
        actions={
          canEdit && (
            <Button
              render={<Link href="/directory/people/new" />}
              nativeButton={false}
            >
              <Plus aria-hidden="true" />
              New person
            </Button>
          )
        }
      />

      <SearchBar defaultValue={q} placeholder="Search by name or email">
        <NativeSelect
          name="teamId"
          defaultValue={teamId ?? ""}
          className="max-w-52"
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
            <Users
              className="h-8 w-8 text-muted-foreground"
              aria-hidden="true"
            />
          }
          title={hasFilters ? "No people match your search" : "No people yet"}
          description={
            canEdit
              ? "Add a person to start building your directory."
              : "Nobody has added a person yet."
          }
          action={
            canEdit &&
            !hasFilters && (
              <Button
                size="sm"
                render={<Link href="/directory/people/new" />}
                nativeButton={false}
              >
                New person
              </Button>
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((person) => (
            <EntityRow
              key={person.id}
              href={`/directory/people/${person.id}`}
              title={person.name}
              meta={`${person.email}${person.title ? ` · ${person.title}` : ""}`}
              trailing={
                person.memberships.length > 0 && (
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {person.memberships
                      .map((m) => m.team)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((team) => (
                        <Badge key={team.id} variant="outline">
                          {team.name}
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
