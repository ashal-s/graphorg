"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Users } from "lucide-react";

import { LiveSearch } from "@/components/shared/live-search";
import { EntityRow } from "@/components/shared/entity-row";
import { EmptyState } from "@/components/states/empty-state";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { buildOrgChart, flattenOrgChart } from "@/lib/directory/org-chart";
import { matchesSearch } from "@/lib/text-search";

export interface DirectoryPerson {
  id: string;
  name: string;
  email: string;
  title: string | null;
  managerId: string | null;
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
        <div className="flex flex-col gap-2">
          {visible.map((person) => (
            <EntityRow
              key={person.id}
              href={`/directory/people/${person.id}`}
              title={person.name}
              meta={person.title ?? undefined}
              trailing={
                person.teams.length > 0 && (
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {[...person.teams]
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
    </>
  );
}
