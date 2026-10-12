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
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface DepartmentDialogValues {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  headPersonIds: string[];
  teamIds: string[];
  personIds: string[];
}

interface Option {
  id: string;
  name: string;
}

/**
 * Create or edit a department in a popup. With `department` it edits that
 * one ("Edit details"); without, it adds a new one ("New department") and
 * opens its page. A team or person can be in other departments too; which
 * one is their primary is chosen on their own page.
 */
export function DepartmentDialog({
  department,
  parents,
  people,
  teams,
  size,
  withIcon = true,
  variant,
  iconOnly = false,
}: {
  /** Omit to create a new department. */
  department?: DepartmentDialogValues;
  /** Departments it could sit under (never itself or anything beneath it). */
  parents: Option[];
  people: Option[];
  teams: Option[];
  size?: "sm";
  withIcon?: boolean;
  variant?: "default" | "outline";
  /** Just the pencil, with "Edit" on hover. Edit mode only. */
  iconOnly?: boolean;
}) {
  const editing = Boolean(department);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(department?.name ?? "");
  const [description, setDescription] = useState(department?.description ?? "");
  const [parentId, setParentId] = useState(department?.parentId ?? "");
  const [headPersonIds, setHeadPersonIds] = useState(
    department?.headPersonIds ?? [],
  );
  const [teamIds, setTeamIds] = useState(department?.teamIds ?? []);
  const [personIds, setPersonIds] = useState(department?.personIds ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Back to the saved values (or blank, when creating). */
  function reset() {
    setName(department?.name ?? "");
    setDescription(department?.description ?? "");
    setParentId(department?.parentId ?? "");
    setHeadPersonIds(department?.headPersonIds ?? []);
    setTeamIds(department?.teamIds ?? []);
    setPersonIds(department?.personIds ?? []);
    setError(null);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (name.trim().length === 0) {
      setError("Name is required.");
      return;
    }

    setSaving(true);
    const response = await fetch(
      editing ? `/api/departments/${department?.id}` : "/api/departments",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description:
            description.trim().length > 0 ? description.trim() : null,
          parentId: parentId || null,
          headPersonIds,
          teamIds,
          personIds,
        }),
      },
    );
    setSaving(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(
        typeof body?.error === "string"
          ? body.error
          : "Something went wrong. Please try again.",
      );
      return;
    }

    const body = (await response.json()) as { department: { id: string } };
    setOpen(false);
    if (editing) {
      router.refresh();
    } else {
      reset();
      router.push(`/directory/departments/${body.department.id}`);
    }
  }

  return (
    <>
      {iconOnly && editing ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-blue-600 hover:bg-blue-500/10 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-400"
                aria-label="Edit details"
                onClick={() => setOpen(true)}
              />
            }
          >
            <Pencil aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>Edit</TooltipContent>
        </Tooltip>
      ) : (
        <Button size={size} variant={variant} onClick={() => setOpen(true)}>
          {withIcon &&
            (editing ? (
              <Pencil aria-hidden="true" />
            ) : (
              <Plus aria-hidden="true" />
            ))}
          {editing ? "Edit details" : "New department"}
        </Button>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent>
          <div>
            <DialogTitle>
              {editing ? "Edit details" : "New department"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? `Update ${department?.name}.`
                : "Group teams and people, optionally under a parent department."}
            </DialogDescription>
          </div>

          <form onSubmit={save} className="flex flex-col gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="department-dialog-name">Name</Label>
              <Input
                id="department-dialog-name"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Engineering"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="department-dialog-description">Description</Label>
              <Textarea
                id="department-dialog-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is this department responsible for?"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="department-dialog-parent">
                Parent department
              </Label>
              <SearchableSelect
                id="department-dialog-parent"
                options={parents.map((p) => ({ id: p.id, label: p.name }))}
                value={parentId}
                onValueChange={setParentId}
                placeholder="None (top level)"
                emptyLabel="No departments match."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="department-dialog-heads">Department heads</Label>
              <SearchableMultiSelect
                id="department-dialog-heads"
                options={people.map((p) => ({ id: p.id, label: p.name }))}
                values={headPersonIds}
                onValuesChange={setHeadPersonIds}
                placeholder="Search people"
                emptyLabel="No people match."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="department-dialog-teams">Teams</Label>
              <SearchableMultiSelect
                id="department-dialog-teams"
                options={teams.map((t) => ({ id: t.id, label: t.name }))}
                values={teamIds}
                onValuesChange={setTeamIds}
                placeholder="Search teams"
                emptyLabel="No teams match."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="department-dialog-people">People</Label>
              <SearchableMultiSelect
                id="department-dialog-people"
                options={people.map((p) => ({ id: p.id, label: p.name }))}
                values={personIds}
                onValuesChange={setPersonIds}
                placeholder="Search people"
                emptyLabel="No people match."
              />
              <p className="text-xs text-muted-foreground">
                People here belong to the department directly, apart from the
                teams they are on.
              </p>
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
