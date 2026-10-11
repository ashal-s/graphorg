"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";

import { LiveSearch } from "@/components/shared/live-search";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { EmptyState } from "@/components/states/empty-state";
import { NativeSelect } from "@/components/ui/native-select";
import { buildOrgChart, flattenOrgChart } from "@/lib/directory/org-chart";
import { matchesSearch } from "@/lib/text-search";

export interface DirectoryPerson {
  id: string;
  name: string;
  email: string;
  title: string | null;
  managerId: string | null;
  photoSrc?: string | null;
  teams: { id: string; name: string }[];
}

/**
 * The people list with a search box that filters on every keystroke (name,
 * email or position) and a team filter. Everyone is loaded once, so
 * filtering is instant. Ranked by org level: the top of the org first, then
 * each level down; if a filter hides someone's manager they rank as top
 * level.
 */
export function PeopleDirectory({
  people,
  teams,
  canEdit,
  emptyAction,
}: {
  people: DirectoryPerson[];
  teams: { id: string; name: string }[];
  canEdit: boolean;
  /** Shown in the empty state when nobody is in the directory yet. */
  emptyAction?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [teamId, setTeamId] = useState("");

  const visible = useMemo(() => {
    const filtered = people.filter(
      (person) =>
        matchesSearch(query, [person.name, person.email, person.title]) &&
        (teamId === "" || person.teams.some((team) => team.id === teamId)),
    );
    const byId = new Map(filtered.map((person) => [person.id, person]));
    return flattenOrgChart(
      buildOrgChart(
        filtered.map((person) => ({
          id: person.id,
          name: person.name,
          title: person.title,
          managerId: person.managerId,
        })),
      ),
    ).map(({ node }) => byId.get(node.id)!);
  }, [people, query, teamId]);

  const hasFilters = query.trim().length > 0 || teamId !== "";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <LiveSearch
          value={query}
          onChange={setQuery}
          placeholder="Search by name, email or position"
          label="Search people"
        />
        <NativeSelect
          aria-label="Filter by team"
          value={teamId}
          onChange={(event) => setTeamId(event.target.value)}
          className="max-w-52"
        >
          <option value="">All teams</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      {visible.length === 0 ? (
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
          action={canEdit && !hasFilters ? emptyAction : undefined}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {visible.length} {visible.length === 1 ? "person" : "people"}
            {hasFilters ? " found" : ""}
          </p>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((person) => (
              <li key={person.id}>
                <Link
                  href={`/directory/people/${person.id}`}
                  className="group flex h-full items-center gap-3 rounded-xl bg-card p-3.5 ring-1 ring-foreground/10 transition-all hover:-translate-y-px hover:shadow-md hover:ring-primary/40"
                >
                  <PersonAvatar
                    name={person.name}
                    photoUrl={person.photoSrc}
                    className="size-11"
                    textClassName="text-sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      data-slot="name"
                      className="block truncate text-sm font-medium"
                    >
                      {person.name}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {person.title ?? person.email}
                    </span>
                    {person.teams.length > 0 && (
                      <span className="mt-1.5 flex flex-wrap gap-1">
                        {[...person.teams]
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((team) => (
                            <span
                              key={team.id}
                              className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary"
                            >
                              {team.name}
                            </span>
                          ))}
                      </span>
                    )}
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
