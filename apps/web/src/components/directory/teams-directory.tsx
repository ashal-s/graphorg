"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Users2 } from "lucide-react";

import { LiveSearch } from "@/components/shared/live-search";
import { EntityRow } from "@/components/shared/entity-row";
import { EmptyState } from "@/components/states/empty-state";
import { matchesSearch } from "@/lib/text-search";

export interface DirectoryTeam {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
}

/** The teams list with a search box that filters on every keystroke. */
export function TeamsDirectory({
  teams,
  canEdit,
  emptyAction,
}: {
  teams: DirectoryTeam[];
  canEdit: boolean;
  emptyAction?: ReactNode;
}) {
  const [query, setQuery] = useState("");

  const visible = useMemo(
    () =>
      teams.filter((team) =>
        matchesSearch(query, [team.name, team.description]),
      ),
    [teams, query],
  );
  const searching = query.trim().length > 0;

  return (
    <>
      <LiveSearch
        value={query}
        onChange={setQuery}
        placeholder="Search teams"
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={
            <Users2
              className="h-8 w-8 text-muted-foreground"
              aria-hidden="true"
            />
          }
          title={searching ? "No teams match your search" : "No teams yet"}
          description={
            canEdit
              ? "Create a team to start organising people and ownership."
              : "Nobody has created a team yet."
          }
          action={canEdit && !searching ? emptyAction : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((team) => (
            <EntityRow
              key={team.id}
              href={`/directory/teams/${team.id}`}
              title={team.name}
              meta={team.description}
              trailing={
                <p className="text-sm text-muted-foreground">
                  {team.memberCount}{" "}
                  {team.memberCount === 1 ? "person" : "people"}
                </p>
              }
            />
          ))}
        </div>
      )}
    </>
  );
}
