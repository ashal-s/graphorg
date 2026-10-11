"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, UserMinus, UserPlus } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type TeamRole = "lead" | "member" | "trainee";

export interface TeamMember {
  id: string;
  name: string;
  title: string | null;
  email: string;
  teamRole: TeamRole;
}

export interface TeamCandidate {
  id: string;
  name: string;
  title: string | null;
  /** The team this person is on now, if any; adding them moves them. */
  currentTeamName: string | null;
}

const LEVEL_LABELS: Record<TeamRole, string> = {
  lead: "Lead",
  member: "Member",
  trainee: "Trainee",
};

/** Leads are peers at the top; trainees come last. */
const LEVEL_RANK: Record<TeamRole, number> = {
  lead: 0,
  member: 1,
  trainee: 2,
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    parts.length > 1
      ? `${parts[0]![0]}${parts[parts.length - 1]![0]}`
      : (parts[0]?.slice(0, 2) ?? "?");
  return letters.toUpperCase();
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

async function patchPerson(personId: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/people/${personId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : "Something went wrong. Please try again.",
    );
  }
}

function LevelField({
  id,
  level,
  onLevel,
}: {
  id: string;
  level: TeamRole;
  onLevel: (level: TeamRole) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Level</Label>
      <NativeSelect
        id={id}
        value={level}
        onChange={(event) => onLevel(event.target.value as TeamRole)}
      >
        {(Object.keys(LEVEL_LABELS) as TeamRole[]).map((value) => (
          <option key={value} value={value}>
            {LEVEL_LABELS[value]}
          </option>
        ))}
      </NativeSelect>
      <p className="text-xs text-muted-foreground">
        A team can have any number of leads.
      </p>
    </div>
  );
}

export function TeamMembers({
  teamId,
  members,
  candidates,
  readOnly,
}: {
  teamId: string;
  members: TeamMember[];
  candidates: TeamCandidate[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addLevel, setAddLevel] = useState<TeamRole>("member");
  const [busy, setBusy] = useState(false);

  // Edit-role dialog
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [editLevel, setEditLevel] = useState<TeamRole>("member");

  // Hierarchy: leads (peers) first, then members, then trainees; by name
  // within a level.
  const sorted = useMemo(
    () =>
      [...members].sort(
        (a, b) =>
          LEVEL_RANK[a.teamRole] - LEVEL_RANK[b.teamRole] ||
          a.name.localeCompare(b.name),
      ),
    [members],
  );
  const leads = sorted.filter((member) => member.teamRole === "lead");
  const others = sorted.filter((member) => member.teamRole !== "lead");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? candidates.filter((person) => person.name.toLowerCase().includes(q))
      : candidates;
  }, [candidates, query]);

  function toggle(id: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openAdd() {
    setError(null);
    setQuery("");
    setSelected(new Set());
    setAddLevel("member");
    setAddOpen(true);
  }

  async function addSelected() {
    setBusy(true);
    setError(null);
    try {
      await Promise.all(
        [...selected].map((id) =>
          patchPerson(id, { teamId, teamRole: addLevel }),
        ),
      );
      setAddOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to add.");
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  async function saveRole(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      await patchPerson(editing.id, { teamRole: editLevel });
      setEditing(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(member: TeamMember) {
    if (!window.confirm(`Remove ${member.name} from this team?`)) return;
    setError(null);
    try {
      await patchPerson(member.id, { teamId: null });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to remove.");
    }
  }

  function card(member: TeamMember) {
    return (
      <li
        key={member.id}
        className="group relative flex items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-muted/40"
      >
        <Avatar size="lg" className="size-12">
          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
            {initials(member.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <Link
            href={`/directory/people/${member.id}`}
            className="block truncate text-sm font-medium after:absolute after:inset-0 after:rounded-xl hover:underline"
          >
            {member.name}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {member.teamRole !== "member" && (
              <Badge
                variant={member.teamRole === "lead" ? "default" : "secondary"}
              >
                {LEVEL_LABELS[member.teamRole]}
              </Badge>
            )}
          </div>
          {member.title && (
            <p className="truncate text-sm text-muted-foreground">
              {member.title}
            </p>
          )}
          <p className="truncate text-xs text-muted-foreground">
            {member.email}
          </p>
        </div>
        {!readOnly && (
          <div className="relative z-10 flex gap-0.5 self-start">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-blue-600 hover:bg-blue-500/10 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-400"
                    aria-label={`Edit level of ${member.name}`}
                    onClick={() => {
                      setError(null);
                      setEditing(member);
                      setEditLevel(member.teamRole);
                    }}
                  />
                }
              >
                <Pencil aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>Edit level</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${member.name} from this team`}
                    onClick={() => remove(member)}
                  />
                }
              >
                <UserMinus aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>Remove</TooltipContent>
            </Tooltip>
          </div>
        )}
      </li>
    );
  }

  const addTile = !readOnly && (
    <li>
      <button
        type="button"
        onClick={openAdd}
        className="flex h-full min-h-[5.5rem] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <UserPlus className="size-4" aria-hidden="true" />
        Add person
      </button>
    </li>
  );

  const leadNames = leads.map((lead) => lead.name);
  const summary =
    members.length === 0
      ? "Nobody is on this team yet."
      : `${members.length} ${members.length === 1 ? "person" : "people"} on this team.`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>People</CardTitle>
        <CardDescription>
          {summary}
          {members.length > 0 &&
            (leadNames.length > 0
              ? ` Led by ${joinNames(leadNames)}.`
              : " No lead assigned.")}
        </CardDescription>
      </CardHeader>
      {(members.length > 0 || error || !readOnly) && (
        <CardContent className="flex flex-col gap-5">
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {leads.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Leadership
              </h3>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {leads.map(card)}
              </ul>
            </div>
          )}
          {(others.length > 0 || !readOnly) && (
            <div className="flex flex-col gap-2">
              {leads.length > 0 && (
                <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Team
                </h3>
              )}
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {others.map(card)}
                {addTile}
              </ul>
            </div>
          )}
        </CardContent>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <div>
            <DialogTitle>Add people to this team</DialogTitle>
            <DialogDescription>
              A person can be on one team, so anyone already on another team is
              moved here.
            </DialogDescription>
          </div>
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Everyone in the directory is already on this team.
            </p>
          ) : (
            <>
              <Input
                aria-label="Search people"
                placeholder="Search people…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <ul className="flex max-h-56 flex-col divide-y divide-border overflow-y-auto">
                {filtered.map((person) => (
                  <li key={person.id}>
                    <label className="flex cursor-pointer items-center gap-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(person.id)}
                        onChange={() => toggle(person.id)}
                        className="size-4 accent-primary"
                      />
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="font-medium">{person.name}</span>
                        {person.currentTeamName && (
                          <span className="ml-2 text-muted-foreground">
                            currently in {person.currentTeamName}
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className="py-2 text-sm text-muted-foreground">
                    No one matches &ldquo;{query}&rdquo;.
                  </li>
                )}
              </ul>
              <LevelField
                id="add-level"
                level={addLevel}
                onLevel={setAddLevel}
              />
            </>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy || selected.size === 0}
              onClick={addSelected}
            >
              {busy
                ? "Adding…"
                : selected.size > 0
                  ? `Add ${selected.size}`
                  : "Add"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <div>
            <DialogTitle>Edit level</DialogTitle>
            <DialogDescription>
              Set {editing?.name}&rsquo;s level on this team.
            </DialogDescription>
          </div>
          <form onSubmit={saveRole} className="flex flex-col gap-4">
            <LevelField
              id="edit-level"
              level={editLevel}
              onLevel={setEditLevel}
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
