import { and, eq, ilike, or } from "drizzle-orm";
import Link from "next/link";
import { Plus, Users } from "lucide-react";

import { EmptyState } from "@/components/states/empty-state";
import { SearchBar } from "@/components/shared/search-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { getDb } from "@/db";
import { people, teams } from "@/db/schema";
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
        teamId ? eq(people.teamId, teamId) : undefined,
      ),
      with: {
        team: { columns: { id: true, name: true } },
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">People</h1>
          <p className="text-sm text-muted-foreground">
            Everyone in your organisation&apos;s directory.
          </p>
        </div>
        {canEdit && (
          <Button
            render={<Link href="/directory/people/new" />}
            nativeButton={false}
          >
            <Plus aria-hidden="true" />
            New person
          </Button>
        )}
      </div>

      <SearchBar defaultValue={q} placeholder="Search by name or email">
        <Select name="teamId" defaultValue={teamId ?? ""} className="max-w-52">
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
            <Link key={person.id} href={`/directory/people/${person.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{person.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {person.email}
                      {person.title ? ` · ${person.title}` : ""}
                    </p>
                  </div>
                  {person.team && (
                    <Badge variant="outline" className="shrink-0">
                      {person.team.name}
                    </Badge>
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
