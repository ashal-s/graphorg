"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserMinus, UserPlus } from "lucide-react";

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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface TeamMember {
  id: string;
  name: string;
  title: string | null;
}

export interface TeamCandidate {
  id: string;
  name: string;
  title: string | null;
  /** The team this person is on now, if any; adding them moves them. */
  currentTeamName: string | null;
}

async function setTeam(personId: string, teamId: string | null) {
  const response = await fetch(`/api/people/${personId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamId }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : "Something went wrong. Please try again.",
    );
  }
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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  function openDialog() {
    setError(null);
    setQuery("");
    setSelected(new Set());
    setOpen(true);
  }

  async function addSelected() {
    setBusy(true);
    setError(null);
    try {
      await Promise.all([...selected].map((id) => setTeam(id, teamId)));
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to add.");
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  async function remove(member: TeamMember) {
    if (!window.confirm(`Remove ${member.name} from this team?`)) return;
    setError(null);
    try {
      await setTeam(member.id, null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to remove.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>People</CardTitle>
            <CardDescription>
              {members.length === 0
                ? "Nobody is on this team yet."
                : `${members.length} ${members.length === 1 ? "person" : "people"} on this team.`}
            </CardDescription>
          </div>
          {!readOnly && (
            <Button type="button" size="sm" onClick={openDialog}>
              <UserPlus aria-hidden="true" />
              Add people
            </Button>
          )}
        </div>
      </CardHeader>
      {(members.length > 0 || error) && (
        <CardContent className="flex flex-col gap-2">
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <ul className="flex flex-col divide-y divide-border">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <Link
                  href={`/directory/people/${member.id}`}
                  className="min-w-0 hover:underline"
                >
                  <span className="text-sm font-medium">{member.name}</span>
                  {member.title && (
                    <span className="ml-2 text-sm text-muted-foreground">
                      {member.title}
                    </span>
                  )}
                </Link>
                {!readOnly && (
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
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
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
              <ul className="flex max-h-64 flex-col divide-y divide-border overflow-y-auto">
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
              onClick={() => setOpen(false)}
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
    </Card>
  );
}
