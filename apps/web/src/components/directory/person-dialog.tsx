"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";

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

export interface PersonDialogPerson {
  id: string;
  name: string;
  email: string;
  title: string | null;
  photoUrl: string | null;
  teamIds: string[];
  managerId: string | null;
}

/**
 * Create or edit a person in a popup: fill in the details, press Save, and
 * the page refreshes. With `person` it edits that person ("Edit details");
 * without, it adds a new one ("New person").
 */
export function PersonDialog({
  person,
  teams,
  managers,
  size,
  withIcon = true,
  variant,
}: {
  /** Omit to create a new person. */
  person?: PersonDialogPerson;
  teams: { id: string; name: string }[];
  /** Everyone who could be the manager (never includes `person` itself). */
  managers: { id: string; name: string }[];
  size?: "sm";
  withIcon?: boolean;
  variant?: "default" | "outline";
}) {
  const editing = Boolean(person);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(person?.name ?? "");
  const [email, setEmail] = useState(person?.email ?? "");
  const [title, setTitle] = useState(person?.title ?? "");
  const [photoUrl, setPhotoUrl] = useState(person?.photoUrl ?? "");
  const [teamIds, setTeamIds] = useState<string[]>(person?.teamIds ?? []);
  const [managerId, setManagerId] = useState(person?.managerId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Back to the saved values (or blank, when creating). */
  function reset() {
    setName(person?.name ?? "");
    setEmail(person?.email ?? "");
    setTitle(person?.title ?? "");
    setPhotoUrl(person?.photoUrl ?? "");
    setTeamIds(person?.teamIds ?? []);
    setManagerId(person?.managerId ?? "");
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
    const response = await fetch(
      editing ? `/api/people/${person?.id}` : "/api/people",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          title: title.trim().length > 0 ? title.trim() : null,
          photoUrl: photoUrl.trim(),
          teamIds,
          managerId: managerId.length > 0 ? managerId : null,
        }),
      },
    );
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
    if (!editing) reset();
    router.refresh();
  }

  return (
    <>
      <Button size={size} variant={variant} onClick={() => setOpen(true)}>
        {withIcon &&
          (editing ? (
            <Pencil aria-hidden="true" />
          ) : (
            <Plus aria-hidden="true" />
          ))}
        {editing ? "Edit details" : "New person"}
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
            <DialogTitle>{editing ? "Edit details" : "New person"}</DialogTitle>
            <DialogDescription>
              {editing
                ? `Update ${person?.name}'s details.`
                : "Who they are and where they fit in the org."}
            </DialogDescription>
          </div>

          <form onSubmit={save} className="flex flex-col gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="person-dialog-name">Name</Label>
              <Input
                id="person-dialog-name"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Jordan Lee"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="person-dialog-email">Email</Label>
              <Input
                id="person-dialog-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="jordan@example.com"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="person-dialog-title">Title</Label>
              <Input
                id="person-dialog-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Senior Platform Engineer"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="person-dialog-photo">Profile photo</Label>
              <Input
                id="person-dialog-photo"
                type="url"
                inputMode="url"
                value={photoUrl}
                onChange={(event) => setPhotoUrl(event.target.value)}
                placeholder="https://example.com/photo.jpg"
              />
              <p className="text-xs text-muted-foreground">
                A link to an image. Leave blank to show their initials.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="person-dialog-teams">Teams</Label>
              <SearchableMultiSelect
                id="person-dialog-teams"
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
              <Label htmlFor="person-dialog-manager">Manager</Label>
              <SearchableSelect
                id="person-dialog-manager"
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
