"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Users2 } from "lucide-react";

import { AvatarStack } from "@/components/shared/avatar-stack";
import { LiveSearch } from "@/components/shared/live-search";
import { EmptyState } from "@/components/states/empty-state";
import { matchesSearch } from "@/lib/text-search";

export interface DirectoryTeam {
  id: string;
  name: string;
  description: string | null;
  members: {
    id: string;
    name: string;
    photoSrc?: string | null;
    tone?: number;
    teamRole: "lead" | "member" | "trainee";
  }[];
}

function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** The teams list: cards with who is on each, filtered as you type. */
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
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {visible.length} {visible.length === 1 ? "team" : "teams"}
            {searching ? " found" : ""}
          </p>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((team) => {
              const leads = team.members
                .filter((member) => member.teamRole === "lead")
                .map((member) => member.name);
              return (
                <li key={team.id}>
                  <Link
                    href={`/directory/teams/${team.id}`}
                    className="group flex h-full flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-all hover:-translate-y-px hover:shadow-md hover:ring-primary/40"
                  >
                    <span className="flex items-start gap-3">
                      <Users2
                        className="mt-0.5 size-6 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          data-slot="name"
                          className="block truncate font-medium"
                        >
                          {team.name}
                        </span>
                        <span className="line-clamp-2 text-sm text-muted-foreground">
                          {team.description ?? "No description"}
                        </span>
                      </span>
                      <ChevronRight
                        className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </span>

                    <span className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
                      {team.members.length > 0 ? (
                        <AvatarStack people={team.members} />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No members yet
                        </span>
                      )}
                      <span className="min-w-0 text-right text-xs text-muted-foreground">
                        <span className="block font-medium text-foreground">
                          {team.members.length}{" "}
                          {team.members.length === 1 ? "person" : "people"}
                        </span>
                        {leads.length > 0 && (
                          <span className="block truncate">
                            Led by {joinNames(leads)}
                          </span>
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
