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
import {
  SearchableMultiSelect,
  SearchableSelect,
} from "@/components/ui/searchable-select";

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
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [managerId, setManagerId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setEmail("");
    setTitle("");
    setTeamIds([]);
    setManagerId("");
    setError(null);
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
        teamIds,
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

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-person-teams">Teams</Label>
              <SearchableMultiSelect
                id="new-person-teams"
                options={teams.map((team) => ({
                  id: team.id,
                  label: team.name,
                }))}
                values={teamIds}
                onValuesChange={setTeamIds}
                placeholder="Search teams"
                emptyLabel="No teams match."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-person-manager">Manager</Label>
              <SearchableSelect
                id="new-person-manager"
                options={managers.map((manager) => ({
                  id: manager.id,
                  label: manager.name,
                }))}
                value={managerId}
                onValueChange={setManagerId}
                placeholder="Search people"
                emptyLabel="No people match."
              />
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
