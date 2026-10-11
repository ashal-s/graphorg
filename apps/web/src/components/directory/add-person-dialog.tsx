"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

/**
 * "New person" as a popup: fill in the details, press Save, and the list
 * refreshes with them in it.
 */
export function AddPersonDialog({
  teams,
  managers,
  size,
  withIcon = true,
}: {
  teams: { id: string; name: string }[];
  managers: { id: string; name: string }[];
  size?: "sm";
  withIcon?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [teamIds, setTeamIds] = useState<Set<string>>(new Set());
  const [managerId, setManagerId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setEmail("");
    setTitle("");
    setTeamIds(new Set());
    setManagerId("");
    setError(null);
  }

  function toggleTeam(id: string) {
    setTeamIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (name.trim().length === 0) {
      setError("Name is required.");
      return;
    }
    if (email.trim().length === 0) {
      setError("Email is required.");
      return;
    }

    setSaving(true);
    const response = await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        title: title.trim().length > 0 ? title.trim() : null,
        teamIds: [...teamIds],
        managerId: managerId.length > 0 ? managerId : null,
      }),
    });
    setSaving(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const fieldErrors = body?.details as
        Record<string, string[] | undefined> | undefined;
      const firstFieldError = fieldErrors
        ? Object.values(fieldErrors).flat()[0]
        : undefined;
      setError(
        firstFieldError ??
          (typeof body?.error === "string"
            ? body.error
            : "Something went wrong. Please try again."),
      );
      return;
    }

    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <>
      <Button size={size} onClick={() => setOpen(true)}>
        {withIcon && <Plus aria-hidden="true" />}
        New person
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent>
          <div>
            <DialogTitle>New person</DialogTitle>
            <DialogDescription>
              Who they are and where they fit in the org.
            </DialogDescription>
          </div>

          <form onSubmit={save} className="flex flex-col gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-person-name">Name</Label>
              <Input
                id="new-person-name"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Jordan Lee"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-person-email">Email</Label>
              <Input
                id="new-person-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="jordan@example.com"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-person-title">Title</Label>
              <Input
                id="new-person-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Senior Platform Engineer"
              />
            </div>

            {teams.length > 0 && (
              <fieldset className="flex flex-col gap-1.5">
                <legend className="text-sm font-medium">Teams</legend>
                <ul className="flex max-h-32 flex-col divide-y divide-border overflow-y-auto rounded-lg border border-border px-3">
                  {teams.map((team) => (
                    <li key={team.id}>
                      <label className="flex cursor-pointer items-center gap-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={teamIds.has(team.id)}
                          onChange={() => toggleTeam(team.id)}
                          className="size-4 accent-primary"
                        />
                        {team.name}
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-person-manager">Manager</Label>
              <NativeSelect
                id="new-person-manager"
                value={managerId}
                onChange={(event) => setManagerId(event.target.value)}
              >
                <option value="">No manager</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
